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
      const leadRes = await api.getLead(dealId);
      if (leadRes?.lead) {
        setLeadDetail(leadRes.lead);
        if (leadRes.lead.notes) {
          setNotes(leadRes.lead.notes);
        } else if (deal?.notes) {
          setNotes(deal.notes);
        } else {
          setNotes('');
        }
      } else if (deal?.notes) {
        setNotes(deal.notes);
      }
    } catch {
      if (deal?.notes) setNotes(deal.notes);
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
  }, [deal?.notes]);

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

  const handleSaveContact = async (data: ClientContactData) => {
    if (!deal?.id) return;
    try {
      await api.updateLead(deal.id, {
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        zip: data.zip,
      });

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

      if (onUpdateDeal) {
        onUpdateDeal({
          ...deal,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          city: data.city,
        });
      }
      toast.success('Contact info updated');
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
      await fetchLeadData(deal.id);
      toast.success('Touchpoint logged');
    } catch {
      toast.error('Failed to log touchpoint');
    }
  };

  const handleAddNote = async (serializedNote: string, plainContent?: string) => {
    const updated = notes ? `${notes}\n\n${serializedNote}` : serializedNote;
    setNotes(updated);
    if (deal?.id) {
      try {
        await api.updateLead(deal.id, { notes: updated });
        await api.addLeadActivity(deal.id, {
          title: 'Estimator Note',
          description: plainContent || serializedNote,
          activityType: 'note',
        });
        await fetchLeadData(deal.id);
        toast.success('Note added');
      } catch {
        toast.error('Failed to sync note');
      }
    }
  };

  return {
    leadDetail,
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
  };
}
