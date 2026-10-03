import { http, HttpResponse } from 'msw';

export const contractHandlers = [
  http.get('*/api/admin/contracts', () => {
    return HttpResponse.json({
      contracts: [
        {
          id: 1,
          contract_number: 'CON-2026-0001',
          status: 'draft',
          signing_token: 'token-12345',
        },
      ],
    });
  }),

  http.get('*/api/contract/:token', ({ params }) => {
    return HttpResponse.json({
      contract: {
        id: 1,
        contractNumber: 'CON-2026-0001',
        status: 'sent',
        signingToken: params.token,
        clientName: 'John Doe',
        projectAddress: '123 Coast Hwy, Oceanside, CA',
        contractPrice: '$18,500.00',
      },
    });
  }),
];
