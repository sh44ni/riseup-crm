import { http, HttpResponse } from 'msw';

/**
 * Default company-signature handlers: the signature is NOT configured yet.
 * Individual tests override these with `server.use(...)` for configured states.
 */
export const companySignatureHandlers = [
  http.get('*/api/admin/company-signature/status', () =>
    HttpResponse.json({
      configured: false,
      signer_name: null,
      signer_title: null,
      version: null,
      updated_at: null,
    })
  ),

  http.get('*/api/admin/company-signature/history', () => HttpResponse.json({ history: [] })),

  http.get('*/api/admin/company-signature', () =>
    HttpResponse.json({ configured: false, access: 'edit', signature: null })
  ),
];
