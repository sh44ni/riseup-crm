import { describe, it, expect, vi } from 'vitest';
import { broadcastContactUpdated, subscribeContactUpdated, ContactUpdatedDetail } from './syncEventBus';

describe('syncEventBus', () => {
  it('should deliver broadcasted contact updates to subscribers', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeContactUpdated(handler);

    const testPayload: ContactUpdatedDetail = {
      leadId: 42,
      name: 'John Doe',
      phone: '555-1234',
      email: 'john@example.com',
      address: '123 Main St',
      city: 'Fresno',
      zip: '93721',
      source: 'lead_view',
    };

    broadcastContactUpdated(testPayload);

    // broadcastContactUpdated fires both the new and legacy events for backward compat.
    // subscribeContactUpdated listens to both, so handler is called twice per broadcast.
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith(testPayload);

    unsubscribe();

    // After unsubscribe, second broadcast should still result in only 2 total (not 4)
    broadcastContactUpdated({ ...testPayload, name: 'Jane Doe' });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should handle legacy lead events gracefully', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeContactUpdated(handler);

    // Dispatch legacy lead event manually
    const legacyEvent = new CustomEvent('crm:lead-updated', {
      detail: {
        id: 99,
        name: 'Legacy Homeowner',
        address: '456 Elm St',
        city: 'Fresno',
        zip: '93720',
      },
    });
    window.dispatchEvent(legacyEvent);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 99,
        name: 'Legacy Homeowner',
        address: '456 Elm St',
      })
    );

    unsubscribe();
  });
});
