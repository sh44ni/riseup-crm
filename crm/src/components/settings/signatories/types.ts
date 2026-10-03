export interface SignatoryUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role_names: string[];
  signature_title: string;
  signature_type: 'typed' | 'drawn';
  signature_data?: string | null;
  has_signature: boolean;
  is_self?: boolean;
  updated_at?: string | null;
}
