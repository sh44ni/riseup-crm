import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cleanseAuthor, serializeProfileNote } from '@/lib/noteUtils';
import { ClientContactData } from '@/components/clients/ClientEditContactModal';
import { ModalDeal } from './types';
import { DealActivity } from './DealTimelineTab';

export function usePipelineDealData(
  deal: ModalDeal | null,
  isOpen: boolean,
  onUpdateDeal?: (updated: ModalDeal) => void
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [leadDetail, setLeadDetail] = useState<any>(null);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [notes, setNotes] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [localContact, setLocalContact] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    zip?: string;
  }>({});

  const cleanAuthor = cleanseAuthor(user?.name, user?.role);
  const authorName = cleanAuthor.name;
  const authorRole = cleanAuthor.role || 'Owner';

  const fetchLeadData = useCallback(async (dealId: string | number) => {
    if (!dealId) return;
    setIsLoadingDetails(true);

    try {
      // 1. Fetch lead details
      const leadRes = await api.getLead(dealId);
      const lead = leadRes?.lead;
      if (lead) {
        setLeadDetail(lead);

        // Resolve client ID from lead or deal
        const resolvedClientId =
          lead.client_id || (deal as any)?.clientId || (deal as any)?.client_id;

        let clientNotes: string | null = null;
        if (resolvedClientId) {
          try {
            const clientRes = await api.getClient(resolvedClientId);
            if (clientRes?.client?.notes) {
              clientNotes = clientRes.client.notes;
            }
          } catch {
            // Client fetch error, fallback to lead notes
          }
        }

        // Prioritize client record notes (source of truth), then lead notes, then deal notes
        const finalNotes = clientNotes || lead.notes || (deal as any)?.notes || '';
        setNotes(finalNotes);
      } else {
        // If not found as lead, try as client record directly
        try {
          const clientRes = await api.getClient(dealId);
          if (clientRes?.client) {
            setNotes(clientRes.client.notes || (deal as any)?.notes || '');
          } else if ((deal as any)?.notes) {
            setNotes((deal as any).notes);
          }
        } catch {
          if ((deal as any)?.notes) setNotes((deal as any).notes);
        }
      }
    } catch {
      // If getLead failed, attempt fetching client record
      const resolvedClientId =
        (deal as any)?.clientId || (deal as any)?.client_id || dealId;
      if (resolvedClientId) {
        try {
          const clientRes = await api.getClient(resolvedClientId);
          if (clientRes?.client?.notes) {
            setNotes(clientRes.client.notes);
          } else if ((deal as any)?.notes) {
            setNotes((deal as any).notes);
          }
        } catch {
          if ((deal as any)?.notes) setNotes((deal as any).notes);
        }
      } else if ((deal as any)?.notes) {
        setNotes((deal as any).notes);
      }
    }

    try {
      const actRes = await api.getLeadActivities(dealId);
      if (actRes?.activities && Array.isArray(actRes.activities)) {
        setActivities(actRes.activities);
      }
    } catch {
      // activities error suppressed
    } finally {
      setIsLoadingDetails(false);
    }
  }, [deal]);

  useEffect(() => {
    if (isOpen && deal?.id) {
      fetchLeadData(deal.id);
    } else {
      setLeadDetail(null);
      setActivities([]);
      setLocalContact({});
    }
  }, [isOpen, deal?.id, fetchLeadData]);

  const handleClaim = async () => {
    if (isClaiming || !deal?.id) return;
    setIsClaiming(true);
    try {
      await api.claimLead(deal.id);
      await fetchLeadData(deal.id);
      if (onUpdateDeal) {
        onUpdateDeal({
          ...deal,
          assignedToUserId: user?.id,
          assignedToName: user?.name,
          estimator: {
            name: user?.name || 'Assigned',
            avatar: user?.avatar_url || '',
            role: 'Estimator',
          },
        });
      }
      toast.success('Lead claimed successfully');
    } catch {
      toast.error('Failed to claim lead');
    } finally {
      setIsClaiming(false);
    }
  };

  const resolvedClientId =
    leadDetail?.client_id || (deal as any)?.clientId || (deal as any)?.client_id;

  const handleSaveContact = async (data: ClientContactData) => {
    if (!deal?.id) return;
    try {
      // 1. Update lead via leads API
      await api.updateLead(deal.id, {
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });

      // 2. Directly sync to Client 360 record if client ID is known
      const targetClientId =
        leadDetail?.client_id || (deal as any)?.clientId || (deal as any)?.client_id;
      if (targetClientId) {
        try {
          await api.updateClient(targetClientId, {
            full_name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            zip: data.zip,
          });
        } catch {
          // Backend lead sync already synchronizes to clients table
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });

      setLocalContact({
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });

      setLeadDetail((prev: any) =>
        prev
          ? {
              ...prev,
              full_name: data.name,
              phone: data.phone,
              email: data.email,
              address: data.address,
              city: data.city,
              zip: data.zip,
            }
          : prev
      );

      const locationStr = data.address
        ? `${data.address}${data.city ? `, ${data.city}` : ''}`
        : data.city
        ? `${data.city}, CA`
        : 'No address provided';

      if (onUpdateDeal) {
        onUpdateDeal({
          ...deal,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
          zip: data.zip,
          location: locationStr,
        });
      }
      toast.success('Contact info updated and saved to Client 360');
    } catch (err: unknown) {
      toast.error('Failed to update contact info');
      throw err;
    }
  };

  const handleUpdateSqft = async (sqf: number) => {
    if (!deal?.id) return;
    try {
      const res = await api.updateLead(deal.id, { roof_sqf: sqf });
      const newEstVal = res?.lead?.estimated_value != null ? Number(res.lead.estimated_value) : Math.round(sqf * 6.5);
      const newSquares = res?.lead?.roof_squares != null ? Number(res.lead.roof_squares) : Math.round((sqf / 100) * 10) / 10;
      setLeadDetail((prev: any) => ({
        ...(prev || {}),
        roof_sqf: sqf,
        roof_squares: newSquares,
        estimated_value: newEstVal,
        raw_estimated_value: newEstVal,
      }));
      if (onUpdateDeal) {
        onUpdateDeal({
          ...deal,
          roofSqf: sqf,
          value: newEstVal,
          estimatedValue: newEstVal,
        });
      }
      toast.success(`Roof size updated: ${sqf.toLocaleString()} sq ft ($${newEstVal.toLocaleString()})`);
    } catch {
      toast.error('Failed to update roof sq ft.');
    }
  };

  const handleScheduleAppointment = async (dateTime: string) => {
    if (!dateTime || !deal?.id) return;
    try {
      const isoDatetime = new Date(dateTime).toISOString();
      await api.updateLead(deal.id, { site_visit_scheduled_at: isoDatetime } as unknown as Parameters<typeof api.updateLead>[1]);
      const currentStage = leadDetail?.pipeline_stage || (deal as any).stageId || '';
      const preScheduleStages = ['stage_1_lead_gen', 'stage_2_initial_contact', 'new_leads', 'contacted', 'initial_call', 'cold_lead'];
      if (preScheduleStages.some((s) => currentStage.includes(s) || currentStage === s)) {
        await api.updateLead(deal.id, { pipeline_stage: 'stage_3_site_visit_estimate' } as unknown as Parameters<typeof api.updateLead>[1]);
      }
      await fetchLeadData(deal.id);
      if (onUpdateDeal) onUpdateDeal({ ...deal, siteVisitScheduledAt: isoDatetime });
      toast.success('Appointment scheduled');
    } catch {
      toast.error('Failed to schedule appointment');
    }
  };

  const handleCancelAppointment = async () => {
    if (!deal?.id) return;
    if (!window.confirm('Cancel this appointment? The lead will remain in its current stage.')) return;
    try {
      await api.updateLead(deal.id, { site_visit_scheduled_at: null } as unknown as Parameters<typeof api.updateLead>[1]);
      await fetchLeadData(deal.id);
      if (onUpdateDeal) onUpdateDeal({ ...deal, siteVisitScheduledAt: null });
      toast.success('Appointment cancelled');
    } catch {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleLogTouchpoint = async (
    method: 'call' | 'sms' | 'email' | 'meeting' | 'note',
    logNotes: string
  ) => {
    if (!deal?.id || !logNotes.trim()) return;
    const typeLabel = method.toUpperCase();
    const title = `${typeLabel} Touchpoint Logged`;
    const serialized = serializeProfileNote(`${typeLabel}: ${logNotes.trim()}`, authorName, authorRole);

    try {
      await api.addLeadActivity(deal.id, {
        title,
        description: logNotes.trim(),
        activityType: method === 'note' ? 'note' : 'communication',
      });

      const updatedNotes = notes ? `${notes}\n\n${serialized}` : serialized;
      setNotes(updatedNotes);
      await api.updateLead(deal.id, { notes: updatedNotes });

      const resolvedClientId =
        leadDetail?.client_id || (deal as any)?.clientId || (deal as any)?.client_id;
      if (resolvedClientId) {
        try {
          await api.updateClient(resolvedClientId, { notes: updatedNotes });
        } catch {}
      }

      await fetchLeadData(deal.id);
      toast.success('Touchpoint logged');
    } catch {
      toast.error('Failed to log touchpoint');
    }
  };

  const handleAddNote = async (serializedNote: string, plainContent?: string) => {
    const updated = notes ? `${notes}\n\n${serializedNote}` : serializedNote;
    const leadId = deal?.id;
    const clientId =
      leadDetail?.client_id || (deal as any)?.clientId || (deal as any)?.client_id;

    if (!leadId && !clientId) {
      toast.error('No record ID found to save note');
      throw new Error('No record ID found to save note');
    }

    try {
      let saved = false;

      // 1. Save directly to client record if client_id is available
      if (clientId) {
        try {
          await api.updateClient(clientId, { notes: updated });
          saved = true;
        } catch (clientErr) {
          console.warn('Failed to update client directly, saving via lead:', clientErr);
        }
      }

      // 2. Save to lead record if leadId is available
      if (leadId) {
        const leadRes = await api.updateLead(leadId, { notes: updated });
        saved = true;

        // If lead had a client_id returned or discovered, update client record too
        const returnedCid = leadRes?.lead?.client_id || clientId;
        if (returnedCid && !clientId) {
          try {
            await api.updateClient(returnedCid, { notes: updated });
          } catch {}
        }

        try {
          await api.addLeadActivity(leadId, {
            title: 'Field Note Added',
            description: plainContent || serializedNote,
            activityType: 'note',
          });
        } catch {}
      }

      if (!saved) {
        throw new Error('Failed to save field note to client or lead record');
      }

      // Update state and notify parent views
      setNotes(updated);
      if (onUpdateDeal && deal) {
        onUpdateDeal({ ...deal, notes: updated });
      }

      // Invalidate relevant react-query caches
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });

      await fetchLeadData(leadId || clientId!);
      toast.success('Field note saved to client record');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save field note to client record';
      toast.error(msg);
      throw err; // Re-throw so ProfileNotesFeed can roll back optimistic changes
    }
  };

  const handleEditNote = async (
    _noteId: string,
    updatedAllNotes: string,
    _editedContent?: string
  ) => {
    const leadId = deal?.id;
    const clientId =
      leadDetail?.client_id || (deal as any)?.clientId || (deal as any)?.client_id;

    if (!leadId && !clientId) {
      toast.error('No record ID found to update note');
      throw new Error('No record ID found to update note');
    }

    try {
      let saved = false;

      // 1. Update client record
      if (clientId) {
        try {
          await api.updateClient(clientId, { notes: updatedAllNotes });
          saved = true;
        } catch (clientErr) {
          console.warn('Failed to update client directly, saving via lead:', clientErr);
        }
      }

      // 2. Update lead record
      if (leadId) {
        const leadRes = await api.updateLead(leadId, { notes: updatedAllNotes });
        saved = true;

        const returnedCid = leadRes?.lead?.client_id || clientId;
        if (returnedCid && !clientId) {
          try {
            await api.updateClient(returnedCid, { notes: updatedAllNotes });
          } catch {}
        }
      }

      if (!saved) {
        throw new Error('Failed to update field note on client or lead record');
      }

      // Update state and notify parent views
      setNotes(updatedAllNotes);
      if (onUpdateDeal && deal) {
        onUpdateDeal({ ...deal, notes: updatedAllNotes });
      }

      // Invalidate relevant react-query caches
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all() });

      await fetchLeadData(leadId || clientId!);
      toast.success('Field note updated on client record');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update field note';
      toast.error(msg);
      throw err; // Re-throw so ProfileNotesFeed can roll back
    }
  };

  return {
    leadDetail,
    resolvedClientId,
    activities,
    isLoadingDetails,
    notes,
    isClaiming,
    localContact,
    fetchLeadData,
    handleClaim,
    handleSaveContact,
    handleUpdateSqft,
    handleScheduleAppointment,
    handleCancelAppointment,
    handleLogTouchpoint,
    handleAddNote,
    handleEditNote,
  };
}
