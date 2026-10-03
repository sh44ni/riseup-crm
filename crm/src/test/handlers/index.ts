import { authHandlers } from './auth';
import { leadHandlers } from './leads';
import { estimateHandlers } from './estimates';
import { contractHandlers } from './contracts';
import { clientHandlers } from './clients';

export const handlers = [
  ...authHandlers,
  ...leadHandlers,
  ...estimateHandlers,
  ...contractHandlers,
  ...clientHandlers,
];
