import React from 'react';
import { z } from 'zod';
import {
  Clock,
  Phone,
  Calendar,
  FileText,
  RotateCcw,
  Send,
  BadgeCheck,
  HardHat,
  ShieldCheck,
} from 'lucide-react';

export interface PipelineStageOption {
  id: string;
  label: string;
  icon: React.ElementType;
}

export const PIPELINE_STAGE_OPTIONS: PipelineStageOption[] = [
  { id: 'cold_lead', label: 'Cold Lead', icon: Clock },
  { id: 'initial_call', label: 'Contacted', icon: Phone },
  { id: 'estimate_scheduled', label: 'Estimate Scheduled', icon: Calendar },
  { id: 'estimate_sent', label: 'Estimate Sent', icon: FileText },
  { id: 'follow_up', label: 'Follow-Up', icon: RotateCcw },
  { id: 'contract_sent', label: 'Contract Sent', icon: Send },
  { id: 'contract_signed', label: 'Contract Signed', icon: BadgeCheck },
  { id: 'active_jobs', label: 'Active Job', icon: HardHat },
  { id: 'completed', label: 'Lifetime Warrantied', icon: ShieldCheck },
];

export const ROOF_MATERIAL_OPTIONS = [
  'Eagle Concrete Tile',
  'GAF Timberline HDZ Shingles',
  'Standing Seam Metal',
  'Spanish Clay S-Tile',
  'Boral Lightweight Tile',
  'Flat / Torch-Down Modified Bitumen',
  'Commercial Silicone Coating',
];

export const SERVICE_OPTIONS = [
  'Roof Replacement',
  'Tile Re-set & Underlayment',
  'Commercial Coating',
  'Emergency Roof Repair',
  'Fascia & Gutter Installation',
  'Dry Rot Repair',
];

export const ExistingClientFormSchema = z
  .object({
    fullName: z.string().min(2, 'Homeowner full name is required (at least 2 characters)'),
    phone: z.string(),
    email: z.string(),
    secondaryPhone: z.string(),
    clientSince: z.string(),
    address: z.string(),
    city: z.string(),
    zip: z.string(),
    propertyType: z.string(),
    roofType: z.string(),
    roofSqf: z.union([z.number(), z.string()]),
    roofAge: z.union([z.number(), z.string()]),
    stories: z.union([z.number(), z.string()]),
    hoa: z.boolean(),
    pipelineStage: z.string(),
    serviceType: z.string(),
    contractValue: z.union([z.number(), z.string()]),
    notes: z.string(),
    assignedToUserId: z.number().nullable(),
  })
  .refine(
    (data) => Boolean((data.phone && data.phone.trim().length > 0) || (data.email && data.email.trim().length > 0)),
    {
      message: 'At least one contact method (phone or email) is required',
      path: ['phone'],
    }
  );

export type ExistingClientFormData = z.infer<typeof ExistingClientFormSchema>;
