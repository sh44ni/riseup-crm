// Rise Up CRM - CSV Export Utility for Leads
import { Lead } from '@/types/leadTypes';
import { LOSS_REASONS } from '@/components/leads/MarkLeadLostModal';

export function exportLeadsToCsv(leads: Lead[], filenamePrefix = 'rise_up_leads'): void {
  const headers = [
    'ID',
    'Name',
    'Phone',
    'Email',
    'Address',
    'City',
    'Service',
    'Status',
    'Source',
    'Value',
    'Assigned Rep',
    'Loss Reason',
    'Created At',
  ];

  const rows = leads.map((l) => [
    l.id,
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.address || '').replace(/"/g, '""')}"`,
    `"${(l.city || '').replace(/"/g, '""')}"`,
    `"${(l.service || '').replace(/"/g, '""')}"`,
    l.status,
    `"${(l.sourceLabel || '').replace(/"/g, '""')}"`,
    l.value,
    `"${(l.assignedRep || '').replace(/"/g, '""')}"`,
    l.lossReason ? `"${(LOSS_REASONS[l.lossReason]?.label || l.lossReason).replace(/"/g, '""')}"` : '""',
    `"${(l.createdAt || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
