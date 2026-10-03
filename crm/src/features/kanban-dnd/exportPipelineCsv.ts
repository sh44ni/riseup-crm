import { PipelineDealItem } from '@/components/pipeline/pipelineTypes';

export function exportPipelineCSV(deals: PipelineDealItem[], canViewFinances: boolean) {
  const headers = ['ID', 'Homeowner', 'Phone', 'Email', 'Address', 'City', 'Service', 'Value', 'Stage', 'Estimator', 'SLA Status'];
  const rows = deals.map((d) => [
    d.id,
    `"${d.name}"`,
    `"${d.phone}"`,
    `"${d.email}"`,
    `"${d.address}"`,
    `"${d.city}"`,
    `"${d.service}"`,
    canViewFinances ? d.value : '[Protected]',
    d.stageId,
    `"${d.estimator.name}"`,
    d.slaStatus,
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = `rise_up_pipeline_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
