import { describe, it, expect } from 'vitest';
import { normalizeClientStatus, backendClientToClient360 } from '../clientAdapter';
import { isClientLost, Client360Record } from '@/types/client360Types';
import type { BackendClient } from '@/types/backendTypes';

describe('clientAdapter and isClientLost logic', () => {
  describe('normalizeClientStatus', () => {
    it('identifies client_category=lost_lead as closed_lost', () => {
      const res = normalizeClientStatus('lead', 'lost_lead');
      expect(res.status).toBe('closed_lost');
      expect(res.label).toContain('Closed Lost');
    });

    it('identifies status=closed_lost as closed_lost', () => {
      const res = normalizeClientStatus('closed_lost', 'lead');
      expect(res.status).toBe('closed_lost');
    });

    it('identifies status=lost as closed_lost', () => {
      const res = normalizeClientStatus('lost', 'lead');
      expect(res.status).toBe('closed_lost');
    });

    it('identifies client with lostReason as closed_lost even if category/status is lead', () => {
      const res = normalizeClientStatus('lead', 'lead', false, 'competitor_price');
      expect(res.status).toBe('closed_lost');
      expect(res.label).toContain('Closed Lost');
    });

    it('identifies active_job correctly', () => {
      const res = normalizeClientStatus('active_job', 'existing_client');
      expect(res.status).toBe('active_job');
    });

    it('identifies completed correctly', () => {
      const res = normalizeClientStatus('completed', 'existing_client');
      expect(res.status).toBe('completed');
    });
  });

  describe('isClientLost helper', () => {
    it('returns true when client status is closed_lost', () => {
      const record = {
        id: '1',
        name: 'Lost Homeowner',
        status: 'closed_lost',
        statusLabel: 'Closed Lost • Win-Back Opportunity',
      } as Client360Record;
      expect(isClientLost(record)).toBe(true);
    });

    it('returns true when client has lossPostMortem', () => {
      const record = {
        id: '2',
        name: 'Lost Homeowner 2',
        status: 'lead_review',
        statusLabel: 'Pipeline Prospect',
        lossPostMortem: {
          opportunityId: 'OPP-1',
          title: 'Roof Replacement',
          proposedValue: 20000,
          lossReason: 'Price too high',
          lossReasonKey: 'competitor_price',
          lostDate: 'Recent',
          daysAgo: 5,
          autopsyNotes: 'Notes',
          riskVulnerabilities: ['Price'],
          winBackDate: '30 Days',
          winBackStrategy: 'Follow up',
          canReactivate: true,
        },
      } as Client360Record;
      expect(isClientLost(record)).toBe(true);
    });

    it('returns false for active or completed clients', () => {
      const activeRecord = {
        id: '3',
        name: 'Active Homeowner',
        status: 'active_job',
        statusLabel: 'Existing Client • Active Jobsite',
      } as Client360Record;
      expect(isClientLost(activeRecord)).toBe(false);

      const completedRecord = {
        id: '4',
        name: 'Completed Homeowner',
        status: 'completed',
        statusLabel: 'Lifetime Client • 50-Year Warranty',
      } as Client360Record;
      expect(isClientLost(completedRecord)).toBe(false);
    });
  });

  describe('backendClientToClient360', () => {
    it('builds closed_lost record and lossPostMortem when backend has lost_reason', () => {
      const raw: BackendClient = {
        id: 73,
        full_name: 'Lost Client 73',
        status: 'lead',
        client_category: 'lead',
        lost_reason: 'competitor_price',
        created_at: '2026-01-01T00:00:00Z',
      };

      const record = backendClientToClient360(raw);
      expect(record.status).toBe('closed_lost');
      expect(isClientLost(record)).toBe(true);
      expect(record.lossPostMortem).toBeDefined();
      expect(record.lossPostMortem?.lossReason).toBe('competitor_price');
    });

    it('builds closed_lost record when backend has lead_lost_reason', () => {
      const raw: BackendClient = {
        id: 74,
        full_name: 'Lost Client 74',
        status: 'lead',
        client_category: 'lead',
        lead_lost_reason: 'out_of_area',
        created_at: '2026-01-01T00:00:00Z',
      };

      const record = backendClientToClient360(raw);
      expect(record.status).toBe('closed_lost');
      expect(isClientLost(record)).toBe(true);
      expect(record.lossPostMortem?.lossReason).toBe('out_of_area');
    });

    it('correctly parses photo and video media items from documents array', () => {
      const raw = {
        id: 80,
        full_name: 'Media Test Client',
        status: 'active_job',
        client_category: 'existing_client',
        created_at: '2026-01-01T00:00:00Z',
        documents: [
          {
            id: 101,
            name: 'roof_damage.jpg',
            file_url: '/static/uploads/clients/80/roof_damage.jpg',
            file_type: 'image/jpeg',
            file_size: 1048576,
            uploaded_by: 'Inspector Dave',
            created_at: '2026-02-01T12:00:00Z',
          },
          {
            id: 102,
            name: 'gutter_drone_inspection.mp4',
            file_url: '/static/uploads/clients/80/gutter_drone_inspection.mp4',
            file_type: 'video/mp4',
            file_size: 52428800,
            uploaded_by: 'Drone Pilot Sarah',
            created_at: '2026-02-02T14:30:00Z',
          },
        ],
      } as BackendClient;

      const record = backendClientToClient360(raw);
      expect(record.media).toBeDefined();
      expect(record.media?.length).toBe(2);

      const photoItem = record.media?.find((m) => m.name === 'roof_damage.jpg');
      expect(photoItem).toBeDefined();
      expect(photoItem?.mediaType).toBe('photo');
      expect(photoItem?.fileSize).toBe('1.0 MB');
      expect(photoItem?.uploadedBy).toBe('Inspector Dave');

      const videoItem = record.media?.find((m) => m.name === 'gutter_drone_inspection.mp4');
      expect(videoItem).toBeDefined();
      expect(videoItem?.mediaType).toBe('video');
      expect(videoItem?.fileSize).toBe('50.0 MB');
      expect(videoItem?.uploadedBy).toBe('Drone Pilot Sarah');
    });
  });
});
