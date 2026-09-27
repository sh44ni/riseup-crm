/**
 * Rise Up CRM — Cross-View Synchronization Event Bus
 * Broadcasts contact and client updates across Client 360, Leads, Pipeline, and Dashboard.
 */

export interface ContactUpdatedDetail {
  clientId?: string | number;
  leadId?: string | number;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  source?: 'client_360' | 'lead_view' | 'pipeline_view' | string;
}

const EVENT_NAME = 'crm:contact-updated';
const LEGACY_LEAD_EVENT_NAME = 'crm:lead-updated';

export function broadcastContactUpdated(detail: ContactUpdatedDetail) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent<ContactUpdatedDetail>(EVENT_NAME, { detail });
  window.dispatchEvent(event);

  // Harmonize with legacy lead listeners
  const legacyEvent = new CustomEvent<any>(LEGACY_LEAD_EVENT_NAME, {
    detail: {
      id: detail.leadId,
      name: detail.name || detail.full_name,
      address: detail.address,
      city: detail.city,
      zip: detail.zip,
      phone: detail.phone,
      email: detail.email,
      source: detail.source,
    },
  });
  window.dispatchEvent(legacyEvent);
}

export function subscribeContactUpdated(callback: (detail: ContactUpdatedDetail) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ContactUpdatedDetail>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const legacyHandler = (e: Event) => {
    const customEvent = e as CustomEvent<any>;
    if (customEvent.detail) {
      const d = customEvent.detail;
      callback({
        leadId: d.id,
        name: d.name,
        address: d.address,
        city: d.city,
        zip: d.zip,
        phone: d.phone,
        email: d.email,
        source: d.source,
      });
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener(LEGACY_LEAD_EVENT_NAME, legacyHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener(LEGACY_LEAD_EVENT_NAME, legacyHandler);
  };
}
