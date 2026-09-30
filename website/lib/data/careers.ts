import type { Job } from '@/types/job';

export const jobs: Job[] = [
  {
    slug: 'roofing-installer',
    title: 'Roofing Installer',
    department: 'Field Operations',
    employmentType: 'full-time',
    description: 'Install and repair roofing systems on residential and commercial properties across San Diego County. You will work as part of a skilled crew performing tear-offs, underlayment installation, shingle and tile installation, and cleanup.',
    responsibilities: [
      'Install roofing systems according to manufacturer specifications',
      'Perform tear-offs and prepare roof decks for new installations',
      'Install underlayment, flashing, shingles, tiles, and ridge caps',
      'Maintain a clean and safe work environment on every job site',
      'Communicate with crew lead on progress and material needs',
      'Follow all OSHA safety guidelines for working at heights',
    ],
    requirements: [
      '1+ year roofing experience preferred',
      'Comfortable working at heights',
      'Reliable transportation to job sites',
      'Able to lift 50+ lbs regularly',
      'Valid work authorization',
    ],
  },
  {
    slug: 'sales-representative',
    title: 'Sales Representative',
    department: 'Sales',
    employmentType: 'full-time',
    description: 'Generate leads, conduct in-home consultations, and close roofing and solar projects for homeowners across San Diego County. You will be the face of Rise Up for our clients, guiding them through options and building lasting relationships.',
    responsibilities: [
      'Conduct in-home roof inspections and consultations',
      'Present roofing and solar solutions tailored to each client',
      'Prepare and deliver professional proposals and estimates',
      'Follow up on leads and maintain a pipeline in our CRM',
      'Meet or exceed monthly and quarterly sales targets',
      'Build referral relationships with past clients',
    ],
    requirements: [
      'Sales experience (roofing or construction industry a plus)',
      'Strong communication and presentation skills',
      'Self-motivated, commission-driven mindset',
      'Valid driver\'s license and reliable vehicle',
      'Bilingual (English/Spanish) is a plus',
    ],
  },
  {
    slug: 'door-knocker',
    title: 'Door Knocker',
    department: 'Sales',
    employmentType: 'full-time',
    description: 'Canvass neighborhoods to generate leads and schedule free roof inspections for our sales team. This is an entry-level role with significant earning potential and a path to a full sales position.',
    responsibilities: [
      'Canvass designated neighborhoods door-to-door',
      'Engage homeowners and identify potential roofing needs',
      'Schedule free roof inspection appointments for sales reps',
      'Track leads and follow up with interested homeowners',
      'Represent Rise Up professionally in the community',
      'Meet daily and weekly lead generation targets',
    ],
    requirements: [
      'Outgoing, friendly personality',
      'Comfortable approaching homeowners at their door',
      'No experience needed — we train you',
      'Flexible scheduling available (full-time or part-time)',
      'Reliable transportation',
    ],
  },
  {
    slug: 'administrative-staff',
    title: 'Administrative Staff',
    department: 'Office',
    employmentType: 'full-time',
    description: 'Handle scheduling, client calls, paperwork, and support daily office operations at our San Diego headquarters. You are the organizational backbone that keeps our projects running smoothly.',
    responsibilities: [
      'Answer and route incoming client calls',
      'Schedule inspections, installations, and follow-up appointments',
      'Process contracts, permits, and project documentation',
      'Coordinate between field crews and sales team',
      'Maintain organized digital and physical filing systems',
      'Assist with invoicing and accounts receivable',
    ],
    requirements: [
      'Office or administrative experience preferred',
      'Proficient with computers, email, and phone systems',
      'Strong organizational and multitasking skills',
      'Bilingual (English/Spanish) is a significant plus',
      'Professional phone manner',
    ],
  },
  {
    slug: 'project-manager',
    title: 'Project Manager',
    department: 'Operations',
    employmentType: 'full-time',
    description: 'Oversee roofing and construction projects from start to finish, managing crews, timelines, materials, and client communication. You ensure every project meets our quality standards and is delivered on time and on budget.',
    responsibilities: [
      'Manage multiple active roofing and construction projects simultaneously',
      'Coordinate crew schedules, material deliveries, and inspections',
      'Conduct daily quality checks and site inspections',
      'Communicate project progress to clients proactively',
      'Handle change orders and scope adjustments professionally',
      'Ensure all safety protocols and building codes are followed',
    ],
    requirements: [
      '3+ years construction or roofing project management experience',
      'Strong leadership and communication skills',
      'Ability to manage multiple projects and crews simultaneously',
      'Valid driver\'s license and reliable vehicle',
      'OSHA certification preferred',
    ],
  },
];

export function getJobBySlug(slug: string): Job | undefined {
  return jobs.find((j) => j.slug === slug);
}

export function getAllJobSlugs(): string[] {
  return jobs.map((j) => j.slug);
}
