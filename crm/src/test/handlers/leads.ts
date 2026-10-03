import { http, HttpResponse } from 'msw';

export const leadHandlers = [
  http.get('*/api/admin/leads', () => {
    return HttpResponse.json([
      {
        id: 1,
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '760-555-0101',
        pipeline_stage: 'new_leads',
        service_type: 'Tile Roofing',
        address: '123 Coast Hwy',
        city: 'Oceanside',
        zip: '92054',
      },
    ]);
  }),

  http.post('*/api/admin/leads', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      ok: true,
      lead: {
        id: 101,
        ...body,
        pipeline_stage: body.pipeline_stage || 'new_leads',
      },
    });
  }),

  http.get('*/api/admin/pipeline', () => {
    return HttpResponse.json({
      ok: true,
      granular_stages: {
        new_leads: [
          { id: 1, full_name: 'John Doe', pipeline_stage: 'new_leads' },
        ],
        inspection_scheduled: [],
        estimate_sent: [],
        contract_signed: [],
      },
      counts: {
        new_leads: 1,
        inspection_scheduled: 0,
        estimate_sent: 0,
        contract_signed: 0,
      },
    });
  }),

  http.put('*/api/admin/pipeline/:leadId/stage', async ({ params, request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      ok: true,
      lead_id: Number(params.leadId),
      stage: body.stage,
    });
  }),
];
