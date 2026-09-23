# WedSiap Access Control & Entitlement Architecture

> **Internal Technical Documentation — Single Source of Truth**  
> *Last Verified Snapshot: September 23, 2026*

---

## 1. Overview

WedSiap implements a **defense-in-depth, two-tier access control system** to manage customer trial periods, Wedding Pass subscriptions, and promotional access:

1. **Frontend Presentation & Route Guard Layer (`App.tsx`, `useCustomerEntitlement`)**:
   - Responsible strictly for **User Experience (UX)**.
   - Provides seamless navigation, client-side route interception (`PREMIUM_ROUTES`), paywall modals, sidebar lock indicators, and checkout redirection.
   - **Crucial Rule:** The frontend is **never** a security boundary. Client-side state, JavaScript flags, or browser network manipulation cannot be trusted for data authorization.

2. **Database Security Enforcement Layer (Supabase PostgreSQL Row Level Security - RLS)**:
   - The **authoritative security boundary**.
   - Direct PostgreSQL RLS policies enforce that unauthenticated callers, expired customers, or cross-workspace attackers cannot execute `SELECT`, `INSERT`, `UPDATE`, or `DELETE` on premium domain tables, even if direct REST/GraphQL requests are crafted with valid user JWTs.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser (Frontend)                │
│                                                             │
│   User Action ──► Route Guard ──► [Expired?] ──► Paywall UX │
│                          │                                  │
│                 (Allowed or Bypassed)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Direct HTTP REST / Supabase Client
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL (Database)              │
│                                                             │
│   SQL Query ──► Row Level Security (RLS) Policy             │
│                      │                                      │
│                      ├── Check 1: Workspace Ownership       │
│                      └── Check 2: has_active_workspace_access│
│                              │                              │
│                      [Valid?] ──► ALLOW DATA                │
│                      [Expired/Invalid?] ──► 403 FORBIDDEN   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Access States

The table below outlines all valid access states defined in the repository (`src/types/admin.ts`, `src/hooks/useCustomerEntitlement.ts`, and Supabase SQL functions):

| Access State | Tier (`tier`) | Source (`source`) | Access Granted? | Technical Definition & Invariants |
| :--- | :---: | :---: | :---: | :--- |
| **Active Trial** | `Trial` | `trial` | **YES** | Workspace within 14 days of creation (`created_at + 14 days > NOW()`) or explicit entitlement record with `expires_at > NOW()`. |
| **Expired Trial** | `Expired` | `trial` | **NO** | Trial duration has elapsed (`expires_at <= NOW()` or `created_at + 14 days <= NOW()`), and no paid order exists. |
| **Active Complimentary** | `Paid` | `complimentary` | **YES** | Admin-granted partner/influencer access with active future timestamp (`expires_at > NOW()`). |
| **Expired Complimentary** | `Expired` | `complimentary` | **NO** | Complimentary grace period ended (`expires_at <= NOW()`). |
| **Wedding Pass (Paid Unlimited)** | `Paid` | `purchased` | **YES** | Verified customer order with `status = 'paid'` or `customer_access_entitlements` record with `tier = 'Paid'` and `expires_at IS NULL`. Lifetime access; trial expiry is permanently superseded. |
| **No Entitlement / Anonymous** | `None` / `null` | N/A | **NO** | Caller is unauthenticated or workspace record has no matching user. |
| **Cross-Workspace Attempt** | Any | Any | **NO** | Authenticated user attempting to query or modify a `workspace_id` owned by another user. Blocked by workspace ownership condition. |

---

## 3. Access Decision Flow

Every read and write request follows this authoritative evaluation path:

```text
Authenticated Request (JWT with auth.uid())
                   │
                   ▼
       Resolve Target Workspace
                   │
    Does user own workspace? (user_id = auth.uid())
                   │
         ├── NO ───┴─────────────────────────────► [DENIED: 403 Forbidden / 0 rows]
         │
        YES
         │
         ▼
   Evaluate Active Access via public.has_active_workspace_access(workspace_id)
         │
         ├── 1. Entitlement Record: tier = 'Paid' AND expires_at IS NULL ──► [ACCESS GRANTED]
         │
         ├── 2. Entitlement Record: expires_at > NOW() ─────────────────────► [ACCESS GRANTED]
         │
         ├── 3. Orders Record: status = 'paid' for workspace ───────────────► [ACCESS GRANTED]
         │
         ├── 4. Fallback: workspace.created_at + 14 days > NOW() ───────────► [ACCESS GRANTED]
         │
         └── 5. Otherwise (Expired Trial / Expired Complimentary) ─────────► [DENIED: 403 Forbidden]
```

---

## 4. Entitlement Data Model

The access control subsystem relies on three core PostgreSQL tables in the `public` schema:

### `public.customer_access_entitlements`
Stores the authoritative access tier and expiration for a workspace.

| Field Name | Type | Nullable? | Purpose & Behavioral Impact |
| :--- | :---: | :---: | :--- |
| `workspace_id` | `UUID` | No (PK) | Foreign key referencing `public.workspaces(id)` on delete cascade. |
| `tier` | `TEXT` | No | Current tier: `'Trial'`, `'Paid'`, or `'Expired'`. |
| `source` | `TEXT` | No | Origin of entitlement: `'trial'`, `'purchased'`, or `'complimentary'`. |
| `started_at` | `TIMESTAMPTZ` | No | Timestamp when the current entitlement commenced. |
| `expires_at` | `TIMESTAMPTZ` | **Yes** | Expiration timestamp. **Semantic rule:** `NULL` strictly signifies **unlimited lifetime access** (Wedding Pass). A future timestamp denotes temporary access. A past timestamp denotes expired access. |
| `granted_by` | `TEXT` | Yes | Audit field indicating who authorized access (e.g., `'system_order'`, `'admin_user_id'`). |
| `notes` | `TEXT` | Yes | Context notes added during administrative adjustments. |
| `updated_at` | `TIMESTAMPTZ` | No | Modification timestamp for cache busting and ordering. |

### `public.orders`
Authoritative record for commercial transactions.
- Fields evaluated: `workspace_id UUID`, `status TEXT`.
- An order with `status = 'paid'` guarantees `has_active_workspace_access() = TRUE`, ensuring payment fulfillment is never blocked by delayed background entitlement updates.

### `public.workspaces`
- Fields evaluated: `id UUID`, `user_id UUID`, `created_at TIMESTAMPTZ`.
- Used to verify user ownership (`workspaces.user_id = auth.uid()`) and compute the default 14-day trial window (`created_at + INTERVAL '14 days'`).

---

## 5. `public.has_active_workspace_access`

The database function `public.has_active_workspace_access(p_workspace_id UUID)` is the **central security predicate** of WedSiap.

### SQL Implementation Contract
```sql
CREATE OR REPLACE FUNCTION public.has_active_workspace_access(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ent RECORD;
    v_ws RECORD;
BEGIN
    IF p_workspace_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Check explicit record in customer_access_entitlements
    SELECT * INTO v_ent 
    FROM public.customer_access_entitlements 
    WHERE workspace_id = p_workspace_id
    ORDER BY updated_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Unlimited Paid Wedding Pass
        IF v_ent.tier = 'Paid' AND v_ent.expires_at IS NULL THEN
            RETURN TRUE;
        END IF;
        -- Active Trial, Active Complimentary, or Paid with future expires_at
        IF v_ent.expires_at IS NOT NULL AND v_ent.expires_at > NOW() THEN
            RETURN TRUE;
        END IF;
        RETURN FALSE;
    END IF;

    -- 2. Fallback: Check if workspace has a completed paid order
    IF EXISTS (
        SELECT 1 FROM public.orders 
        WHERE workspace_id = p_workspace_id AND status = 'paid'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Fallback for newly created workspace without entitlement record (14 days trial)
    SELECT created_at INTO v_ws FROM public.workspaces WHERE id = p_workspace_id;
    IF FOUND AND (v_ws.created_at + INTERVAL '14 days') > NOW() THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;
```

> [!IMPORTANT]
> This function executes with `SECURITY DEFINER` privileges to read `customer_access_entitlements`, `orders`, and `workspaces` in a hardened subquery without exposing administrative tables to public tampering. It is executable by `authenticated`, `anon`, and `service_role`.

---

## 6. RLS Architecture & Policy Structure

All premium domain tables are protected by **two discrete, orthogonal policies**:

### 1. `entitlement_access` (Customer Data Boundary)
Applied `FOR ALL` operations (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) to `authenticated` users:
```sql
CREATE POLICY "entitlement_access" ON public.<table>
AS PERMISSIVE FOR ALL TO authenticated
USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
    AND public.has_active_workspace_access(workspace_id)
)
WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
    AND public.has_active_workspace_access(workspace_id)
);
```

### 2. `admin_and_service_access` (Administrative & System Operations)
Guarantees administrative oversight and background worker operations without compromising customer isolation:
```sql
CREATE POLICY "admin_and_service_access" ON public.<table>
AS PERMISSIVE FOR ALL TO authenticated, service_role
USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role')
WITH CHECK (public.is_admin(auth.uid()) OR auth.role() = 'service_role');
```
*Note: For standard non-admin users, `is_admin(auth.uid())` and `auth.role() = 'service_role'` evaluate to `FALSE`, preventing any leakage.*

---

## 7. Protected Premium Tables

The following 12 database tables contain premium wedding planning data and are strictly guarded by `has_active_workspace_access`:

| # | Table Name | Workspace Relationship | Direct Columns Checked |
| :---: | :--- | :--- | :--- |
| 1 | `tasks` | Direct FK | `workspace_id` |
| 2 | `wedding_events` | Direct FK | `workspace_id` |
| 3 | `budget_allocations` | Direct FK | `workspace_id` |
| 4 | `budget_expenses` | Direct FK | `workspace_id` |
| 5 | `vendors` | Direct FK | `workspace_id` |
| 6 | `guests` | Direct FK | `workspace_id` |
| 7 | `notes` | Direct FK | `workspace_id` |
| 8 | `seserahan_plans` | Direct FK | `workspace_id` |
| 9 | `seserahan_categories`| Child of `seserahan_plans` | `plan_id -> seserahan_plans.workspace_id` |
| 10 | `seserahan_items` | Child of `seserahan_plans` | `plan_id -> seserahan_plans.workspace_id` |
| 11 | `moodboards` | Direct FK (Unique per workspace) | `workspace_id` |
| 12 | `moodboard_items` | Direct FK & Child of moodboard | `workspace_id` |

---

## 8. Cross-Workspace Isolation Invariant

WedSiap enforces workspace tenant isolation **unconditionally**:
$$\text{Access Granted} = (\text{Workspace Owned by Caller}) \ \mathbf{AND} \ (\text{Active Entitlement Valid})$$

Even if User B holds an unlimited paid Wedding Pass, User B can **never** query or modify User A's workspace data. The `workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())` clause strictly prevents horizontal privilege escalation.

---

## 9. Frontend Access Control Implementation

### `PREMIUM_ROUTES` Set (`src/App.tsx`)
```typescript
const PREMIUM_ROUTES = new Set<string>([
  'checklist',
  'budget',
  'seserahan',
  'moodboard',
  'timeline',
  'vendor',
  'guests',
  'notes',
  'administration',
  'administrasi',
]);
```

### Route Guard Evaluation (`src/App.tsx`)
```typescript
// Intercept direct URL, history navigation, and tab switching
if (PREMIUM_ROUTES.has(currentRoute) && !isEntitlementLoading && isExpired) {
  return (
    <PaywallView
      onUpgrade={() => navigateTo('checkout')}
      onBackToHome={() => navigateTo('dashboard')}
    />
  );
}
```

### Sidebar Lock UX (`src/components/dashboard/DesktopSidebar.tsx`)
- Calculates `isLocked = isPremium && isExpired`.
- When locked, sidebar items display `<Lock className="w-3.5 h-3.5" />`.
- Clicking a locked item immediately triggers `onNavigate('checkout')`.

### Contextual Status Banner (`src/components/access/AccessStatusBanner.tsx`)
- Rendered prominently on `Dashboard.tsx`.
- Displays remaining trial days for active trials.
- Renders an alert badge (*"Masa Uji Coba Telah Berakhir - Perlu Aktivasi"*) when expired.
- Automatically hides for active Wedding Pass subscribers (`isPaidActive = true`).

---

## 10. Auto-Expiry Mechanism

WedSiap implements automatic browser expiry detection without requiring full page reloads (`src/hooks/useCustomerEntitlement.ts`):

```typescript
useEffect(() => {
  if (!entitlement?.expiresAt) return;
  const expiryMs = new Date(entitlement.expiresAt).getTime();
  const delay = expiryMs - Date.now();
  
  // If expiry occurs within the next 24 hours while tab is open
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
    const timer = setTimeout(() => {
      fetchEntitlement(); // Re-evaluates status and transitions state to isExpired = true
    }, delay + 1000);
    return () => clearTimeout(timer);
  }
}, [entitlement?.expiresAt, fetchEntitlement]);
```
When the timer fires:
1. `fetchEntitlement()` refreshes customer state from Supabase.
2. `isExpired` transitions to `true`.
3. `App.tsx` route guard re-renders, immediately replacing the active premium page with the paywall screen.

---

## 11. Core Security Invariants (Developer Mandates)

> [!CAUTION]
> **VIOLATING ANY OF THE RULES BELOW WILL INTRODUCE P0 SECURITY VULNERABILITIES:**
> 1. **NEVER rely solely on frontend `isExpired` or route guards for security.** Any user can bypass frontend guards using curl, Postman, or DevTools console.
> 2. **NEVER create a new table containing customer wedding data without enabling RLS** (`ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;`).
> 3. **NEVER create a permissive policy checking only workspace ownership.** Every customer policy on feature tables must include `AND public.has_active_workspace_access(...)`.
> 4. **NEVER grant public or anonymous CRUD access to feature tables.**
> 5. **NEVER disable or drop `has_active_workspace_access` without updating all referencing RLS policies first.**

---

## 12. PostgreSQL Permissive Policy Composition Warning

In PostgreSQL, multiple `PERMISSIVE` policies on the same table and command are combined using logical **`OR`**:

$$\text{Final Authorization} = \text{Policy}_1 \ \mathbf{OR} \ \text{Policy}_2 \ \mathbf{OR} \ \dots \ \mathbf{OR} \ \text{Policy}_n$$

### Real-World Bug Context (September 2026 Incident)
An older legacy policy named `"Allow user workspace access"` existed with the condition:
```sql
USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
```
When a new entitlement policy was added with:
```sql
USING (workspace_id IN (...) AND public.has_active_workspace_access(workspace_id))
```
PostgreSQL evaluated:
$$\text{Result} = (\text{TRUE [owner]}) \ \mathbf{OR} \ (\text{FALSE [expired]}) = \mathbf{TRUE}$$
This allowed expired users to bypass entitlement enforcement completely on tables where legacy policies had not been dropped.

> [!WARNING]
> Whenever modifying table policies, inspect `pg_policies` to verify that **NO** legacy policies remain active on that table.

---

## 13. Verified Security Baseline (Snapshot: 2026-09-23)

Automated live E2E and database verification verified the following results against the live production environment (`heavutiajotepwfhlccx`):

```text
=== LIVE VERIFICATION RESULTS ===
* 12/12 Premium Tables Tested Direct REST CRUD:
  - Expired User INSERT: 403 Forbidden (Blocked)
  - Expired User SELECT: 0 rows returned (Blocked)
  - Expired User UPDATE: 0 rows modified (Blocked)
  - Expired User DELETE: 0 rows deleted (Blocked)
* Active Trial: Full Access (HTTP 201 / 200 OK)
* Wedding Pass (Unlimited): Full Access (HTTP 201 / 200 OK)
* Active Complimentary: Full Access (HTTP 201 / 200 OK)
* Expired Complimentary: Denied (HTTP 403 / 0 rows)
* Cross-Workspace Access: Blocked (HTTP 403 / 0 rows)
* Frontend Automated Suite: 105 test files passed, 1,172 tests passed
* Production Build: Built successfully (0 compiler errors)
```

---

## 14. Developer Regression Checklist

Before merging any PR modifying authentication, database migrations, pricing, payments, or planning features, ensure all items below are checked:

- [ ] Active Trial user retains read and write access across all 12 premium modules.
- [ ] Expired Trial user is blocked from reading or writing data via direct Supabase REST requests.
- [ ] Wedding Pass user retains unlimited access regardless of original trial duration.
- [ ] Active Complimentary user can access features; Expired Complimentary user is blocked.
- [ ] Cross-workspace access remains strictly forbidden (`403 Forbidden`).
- [ ] Direct URL entry to premium routes (`/checklist`, `/budget`, etc.) redirects to paywall for expired users.
- [ ] Page refresh on a paywalled route does not temporarily leak data.
- [ ] Logging out and logging back in with an expired account preserves paywall state.
- [ ] Browser history navigation (Back/Forward) cannot bypass route guards.
- [ ] No extraneous permissive RLS policies exist on target tables in `pg_policies`.
- [ ] `npm test` passes 100% of unit and integration tests.
- [ ] `npm run build` succeeds with zero TypeScript errors.

---

## 15. High-Risk Access Control Components

Modifying any of the files or database entities below requires mandatory pair review and security sign-off:

1. **Database Functions**: `public.has_active_workspace_access(UUID)`
2. **Entitlement Repository**: `src/repositories/supabaseAdminAdapter.ts` (`fetchCustomerEntitlement`)
3. **Core Entitlement Hook**: `src/hooks/useCustomerEntitlement.ts`
4. **App Routing & Guards**: `src/App.tsx` (`PREMIUM_ROUTES`, line 1150-1196)
5. **Database RLS Policies**: Any migration modifying policies on the 12 premium tables
6. **Payment Status Webhook & Sync**: `src/services/payment/midtransStatusMapper.ts`

---

## 16. Audit Log & Rollback Reference

Before executing the dynamic policy cleanup on September 23, 2026, an immutable snapshot of all legacy policies was captured in:
```sql
public._rls_policy_backup_20260924
```
- **Retention Rule**: Do **not** drop or truncate this table without explicit engineering review.
- **Purpose**: Serves as a reference point for auditing legacy policy configurations and verifying dropped policy names.

---

## 17. Troubleshooting Guide

### Issue A: Expired user can still read or write data via REST
1. Execute `SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = '<target_table>'`.
2. Check if more than two policies (`entitlement_access` and `admin_and_service_access`) exist.
3. If an extra permissive policy exists, drop it: `DROP POLICY "<legacy_policy_name>" ON public.<target_table>;`.
4. Test the helper function directly: `SELECT public.has_active_workspace_access('<workspace_id>');`. If it returns `true`, inspect `customer_access_entitlements` and `orders` for stale records.

### Issue B: Active subscriber or active trial user cannot access features
1. Inspect the workspace entitlement: `SELECT * FROM public.customer_access_entitlements WHERE workspace_id = '<workspace_id>';`.
2. Verify `expires_at`: Ensure it is either `NULL` (for Wedding Pass) or a future date (`> NOW()`).
3. If no entitlement record exists, check `workspaces.created_at`. If older than 14 days and unpaid, user has correctly expired.
4. Verify PostgREST schema cache: Run `NOTIFY pgrst, 'reload schema';` in Supabase SQL editor if a function was recently modified.

---

## 18. Maintenance Principles

1. **Access control is critical infrastructure, not a UI feature.**
2. **Always test both ends:** Every PR touching access control must verify the React presentation layer and execute direct SQL/REST tests against the database layer.
3. **Keep policies minimal and declarative.** Do not split CRUD permissions across multiple divergent permissive policies unless explicitly required by business rules.
