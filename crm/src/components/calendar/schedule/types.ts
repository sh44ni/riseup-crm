import { z } from 'zod';
import { OperationCategory, OperationPriority, TeamMemberResource } from '@/types/calendarTypes';

export const ScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  assignedTo: z.string().optional(),
});

export const PRESET_TITLES = [
  '12-Pt Roof Inspection & Estimate',
  'Order Materials & Shingles',
  'Follow up on City Building Permit',
  'Jobsite Punchlist Walkthrough',
  'Client Scope & Contract Meeting',
  'Warranty Seal & Roof Check-in',
];

export interface PipelineLeadItem {
  id: number | string;
  full_name?: string;
  city?: string;
  address?: string;
  service_type?: string;
}

export interface RealJobItem {
  id: number | string;
  customer_name?: string;
  job_number?: string;
  address?: string;
  city?: string;
}

export const START_TIME_OPTIONS = [
  '07:00 AM',
  '07:30 AM',
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '05:00 PM',
];

export const END_TIME_OPTIONS = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
];
