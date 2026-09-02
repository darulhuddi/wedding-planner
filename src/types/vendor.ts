import { CategoryId } from './onboarding';

export type VendorStatus =
  | 'considering'
  | 'contacted'
  | 'negotiating'
  | 'selected'
  | 'not_selected';

export interface Vendor {
  id: string;
  name: string;
  category: CategoryId;
  status: VendorStatus;
  quotedPrice: number | null;
  contactName: string | null;
  phone: string | null;
  instagram: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
