import { authHandlers } from './auth';
import { leadHandlers } from './leads';
import { estimateHandlers } from './estimates';
import { contractHandlers } from './contracts';
import { clientHandlers } from './clients';
import { companySignatureHandlers } from './companySignature';

export const handlers = [
  ...authHandlers,
  ...leadHandlers,
  ...estimateHandlers,
  ...contractHandlers,
  ...clientHandlers,
  ...companySignatureHandlers,
];
