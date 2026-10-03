import { http, HttpResponse } from 'msw';

export const estimateHandlers = [
  http.get('*/api/admin/estimates', () => {
    return HttpResponse.json({
      estimates: [
        {
          id: 1,
          estimate_number: 'EST-2026-0001',
          customer_name: 'John Doe',
          total: 18500,
          status: 'draft',
        },
      ],
      summary: { total_count: 1, pipeline_value: 18500 },
    });
  }),

  http.post('*/api/admin/estimates/calculate', async ({ request }) => {
    const body = (await request.json()) as any;
    const squares = Number(body?.roof_squares || 25);
    return HttpResponse.json({
      ok: true,
      total_price: squares * 750,
      material_subtotal: squares * 350,
      labor_subtotal: squares * 300,
      margin_pct: 30,
    });
  }),
];
