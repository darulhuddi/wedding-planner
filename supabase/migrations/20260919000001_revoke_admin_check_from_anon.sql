-- Migration: Revoke Admin Check Functions from Anonymous Role (P0 Security Fix)
-- Date: 2026-09-19
-- Issue: Functions is_admin() and check_current_user_is_admin() were granted to 'anon' role,
--        allowing unauthenticated users to enumerate admin status of arbitrary user IDs.
-- Fix: Revoke EXECUTE permission from 'anon' role for both functions.

-- Revoke is_admin from anon
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM anon;

-- Revoke check_current_user_is_admin from anon  
REVOKE EXECUTE ON FUNCTION public.check_current_user_is_admin() FROM anon;

-- Verify only authenticated and service_role retain access
-- (authenticated and service_role grants remain from previous migration)
