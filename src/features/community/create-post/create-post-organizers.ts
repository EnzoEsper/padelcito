import type { CommunityPostContactInput } from '@/features/community/post-display';
import { parseArgentinaWhatsAppToE164 } from '@/lib/argentina-whatsapp-phone';

export type OrganizerContactDraft = {
  phoneText: string;
  label: string;
  isAuthorSlot: boolean;
};

export function buildOrganizerContactsFromDrafts(
  drafts: OrganizerContactDraft[],
):
  | { ok: true; contacts: CommunityPostContactInput[] }
  | { ok: false; message: string } {
  if (drafts.length < 1 || drafts.length > 3) {
    return { ok: false, message: 'Add between 1 and 3 organizer WhatsApp numbers.' };
  }

  const phones = new Set<string>();
  const contacts: CommunityPostContactInput[] = [];

  for (const draft of drafts) {
    const parsed = parseArgentinaWhatsAppToE164(draft.phoneText);
    if (!parsed.ok || parsed.e164.length === 0) {
      return {
        ok: false,
        message: parsed.ok ? 'Each organizer needs a WhatsApp number.' : parsed.message,
      };
    }
    if (phones.has(parsed.e164)) {
      return { ok: false, message: 'Organizer numbers must be unique.' };
    }
    phones.add(parsed.e164);
    const label = draft.label.trim();
    if (label.length > 40) {
      return { ok: false, message: 'Organizer labels cannot exceed 40 characters.' };
    }
    contacts.push({
      phone: parsed.e164,
      label: label.length > 0 ? label : null,
    });
  }

  return { ok: true, contacts };
}
