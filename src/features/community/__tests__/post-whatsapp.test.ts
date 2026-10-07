import {
  buildOrganizerVerificationMessage,
  buildPostWhatsAppMessage,
} from '@/features/community/post-whatsapp';
import { buildOrganizerContactsFromDrafts } from '@/features/community/create-post/use-create-post-form';

const basePost = {
  title: 'Elevia Open',
  venue_name: 'Jockey Club',
  type: 'tournament' as const,
  event_start: '2026-11-01T10:00:00.000Z',
  event_end: null,
};

describe('buildPostWhatsAppMessage', () => {
  it('uses type-specific intent for tournaments', () => {
    const message = buildPostWhatsAppMessage(basePost);
    expect(message).toContain('register for the tournament');
    expect(message).toContain('Elevia Open');
  });

  it('uses training intent for training posts', () => {
    const message = buildPostWhatsAppMessage({ ...basePost, type: 'training' });
    expect(message).toContain('sign up for the training');
  });
});

describe('buildOrganizerVerificationMessage', () => {
  it('includes moderation intro and event title', () => {
    const message = buildOrganizerVerificationMessage(basePost, { label: 'Maria' });
    expect(message).toContain('Padelcito moderation');
    expect(message).toContain('Elevia Open');
    expect(message).toContain('Maria');
  });
});

describe('buildOrganizerContactsFromDrafts', () => {
  it('rejects duplicate phones', () => {
    const result = buildOrganizerContactsFromDrafts([
      { phoneText: '11 2345-6789', label: '', isAuthorSlot: true },
      { phoneText: '11 2345-6789', label: 'Co-organizer', isAuthorSlot: false },
    ]);
    expect(result.ok).toBe(false);
  });

  it('parses valid Argentine numbers', () => {
    const result = buildOrganizerContactsFromDrafts([
      { phoneText: '11 2345-6789', label: 'Main', isAuthorSlot: true },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contacts[0].phone.startsWith('+549')).toBe(true);
      expect(result.contacts[0].label).toBe('Main');
    }
  });
});
