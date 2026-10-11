import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildContract,
  sendContract,
  sendContractSms,
  autoSaveContractDraft,
  deleteContractDraft,
  archiveContract,
  unarchiveContract,
  signContract,
  counterSignContract,
  type ContractData,
} from '@/api/contractApi';

export function useBuildContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContractData) => buildContract(data),
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
      if (vars.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['contracts', 'by-lead', String(vars.lead_id)] });
        queryClient.invalidateQueries({ queryKey: ['contracts', 'draft-by-lead', String(vars.lead_id)] });
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(vars.lead_id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
    },
  });
}

export function useSendContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      toEmail,
      customMessage,
    }: {
      contractId: number;
      toEmail: string;
      customMessage?: string;
    }) => sendContract(contractId, toEmail, customMessage),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });
}

export function useSendContractSmsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      phone,
      customMessage,
    }: {
      contractId: number;
      phone: string;
      customMessage?: string;
    }) => sendContractSms(contractId, phone, customMessage),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });
}

export function useAutoSaveContractDraftMutation() {
  return useMutation({
    mutationFn: ({
      contractId,
      contractData,
    }: {
      contractId: number | string;
      contractData: unknown;
    }) => autoSaveContractDraft(contractId, contractData),
  });
}

export function useDeleteContractDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: number | string) => deleteContractDraft(contractId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });
}

export function useArchiveContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: number | string) => archiveContract(contractId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });
}

export function useUnarchiveContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: number | string) => unarchiveContract(contractId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });
}

export function useSignContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      signedBy,
      signatureDataUrl,
    }: {
      contractId: number;
      signedBy: string;
      signatureDataUrl?: string;
    }) => signContract(contractId, signedBy, signatureDataUrl),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
    },
  });
}

export function useCounterSignContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // The server always applies the current company signature and records the caller as counter-signer.
    mutationFn: ({ contractId }: { contractId: number }) => counterSignContract(contractId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}
