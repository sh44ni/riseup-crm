import { http, HttpResponse } from 'msw';

export const clientHandlers = [
  http.get('*/api/admin/clients', () => {
    return HttpResponse.json({
      clients: [
        {
          id: 1,
          full_name: 'Jane Smith',
          phone: '760-555-0102',
          email: 'jane@example.com',
          status: 'opportunity',
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  }),
];
