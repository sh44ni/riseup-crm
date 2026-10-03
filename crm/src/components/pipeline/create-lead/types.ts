import { z } from 'zod';

export const CreateLeadFormSchema = z.object({
  name: z.string().min(1, 'Please enter the homeowner / company full name.'),
  phone: z
    .string()
    .min(1, 'Please enter a valid 10-digit phone number.')
    .refine((val) => val.replace(/\D/g, '').length >= 10, {
      message: 'Please enter a valid 10-digit phone number.',
    }),
  email: z.string().refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email address',
  }),
  service: z.string(),
  sqf: z.string(),
  roofType: z.string(),
  stories: z.string(),
  address: z.string(),
  zipCode: z.string(),
  notes: z.string(),
});

export type CreateLeadFormData = z.infer<typeof CreateLeadFormSchema>;

export interface CreateLeadPayload {
  name: string;
  phone: string;
  email: string;
  service: string;
  serviceColor: 'sky' | 'amber' | 'emerald' | 'purple' | 'coral' | 'indigo' | 'blue';
  sqf: string;
  roofType: string;
  stories: string;
  address: string;
  zipCode: string;
  notes: string;
  city: string;
  stageId?: string;
}

export function getServiceColor(
  service: string
): 'sky' | 'amber' | 'emerald' | 'purple' | 'coral' | 'indigo' | 'blue' {
  if (service.includes('Tile')) return 'coral';
  if (service.includes('Commercial') || service.includes('Flat')) return 'sky';
  if (service.includes('Repair') || service.includes('Emergency')) return 'amber';
  if (service.includes('Solar')) return 'purple';
  if (service.includes('Gutters') || service.includes('Maintenance')) return 'emerald';
  return 'blue';
}

export const ROOF_TYPES = [
  'Concrete Tile',
  'Clay Tile',
  'Architectural Shingle',
  '3-Tab Shingle',
  'Standing Seam Metal',
  'Flat / Torch Down',
  'Silicon Coating',
  'Other / Unknown',
];

export const SERVICE_OPTIONS = [
  'Residential Roofing',
  'Commercial Roofing',
  'Tile Roof Restoration',
  'Emergency Roof Leak Repair',
  'Solar Detach & Reset',
  'Seamless Gutters & Fascia',
  'Roof Inspection & Certification',
];

export const STORIES_OPTIONS = ['1 Story', '2 Stories', '3+ Stories', 'Split Level'];
