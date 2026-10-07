import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text, TextInput } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';
import {
  formatArgentinaWhatsAppLocalInput,
  parseArgentinaWhatsAppToE164,
  tryParseArgentinaWhatsAppToE164,
} from '@/lib/argentina-whatsapp-phone';
import type { OrganizerContactDraft } from '@/features/community/create-post/use-create-post-form';

const PLACEHOLDER_COLOR = 'rgba(228,228,228,0.20)';

type PostContactFieldsProps = {
  contacts: OrganizerContactDraft[];
  authorPhoneE164: string | null;
  authorPhoneVerified: boolean;
  onChange: (contacts: OrganizerContactDraft[]) => void;
  /** When true, omit section heading (used inside a collapsible panel). */
  embedded?: boolean;
};

export function PostContactFields({
  contacts,
  authorPhoneE164,
  authorPhoneVerified,
  onChange,
  embedded = false,
}: PostContactFieldsProps) {
  useEffect(() => {
    if (contacts.length > 0 || authorPhoneE164 === null) return;
    onChange([
      {
        phoneText: formatArgentinaWhatsAppLocalInput(authorPhoneE164),
        label: '',
        isAuthorSlot: true,
      },
    ]);
  }, [authorPhoneE164, contacts.length, onChange]);

  function updateContact(index: number, patch: Partial<OrganizerContactDraft>): void {
    onChange(contacts.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeContact(index: number): void {
    if (contacts.length <= 1) return;
    onChange(contacts.filter((_, i) => i !== index));
  }

  function addExtraContact(): void {
    if (contacts.length >= 3) return;
    onChange([...contacts, { phoneText: '', label: '', isAuthorSlot: false }]);
  }

  function moveContact(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= contacts.length) return;
    const next = [...contacts];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    onChange(next);
  }

  function addAuthorNumber(): void {
    if (authorPhoneE164 === null) return;
    const already = contacts.some((row) => {
      if (row.isAuthorSlot) return true;
      const parsed = parseArgentinaWhatsAppToE164(row.phoneText);
      return parsed.ok && parsed.e164 === authorPhoneE164;
    });
    if (already) return;
    if (contacts.length >= 3) return;
    onChange([
      ...contacts,
      {
        phoneText: formatArgentinaWhatsAppLocalInput(authorPhoneE164),
        label: '',
        isAuthorSlot: true,
      },
    ]);
  }

  return (
    <View className="gap-3">
      {embedded ? null : (
        <>
          <SectionLabel>Organizer contacts</SectionLabel>
          <Text className="font-grotesk text-sm text-neutral/55">
            Up to 3 WhatsApp numbers. The first is the main organizer.
          </Text>
        </>
      )}

      {contacts.map((contact, index) => (
        <View
          key={`${index}-${contact.isAuthorSlot ? 'own' : 'extra'}`}
          className="gap-2 rounded-xl border border-neutral/10 bg-surface-1 p-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {index === 0 ? (
                <View className="rounded-md bg-blue-mid/20 px-2 py-0.5">
                  <Text className="font-mono text-[10px] uppercase tracking-wider text-blue-mid">
                    Main
                  </Text>
                </View>
              ) : null}
              {contact.isAuthorSlot && authorPhoneVerified ? (
                <Text className="font-grotesk text-xs text-neutral/45">Your number · OTP verified</Text>
              ) : null}
            </View>
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => moveContact(index, -1)}
                disabled={index === 0}
                className="h-8 w-8 items-center justify-center rounded-lg bg-surface-2"
                accessibilityLabel="Move contact up"
              >
                <Ionicons name="chevron-up" size={16} color="rgba(228,228,228,0.55)" />
              </Pressable>
              <Pressable
                onPress={() => moveContact(index, 1)}
                disabled={index === contacts.length - 1}
                className="h-8 w-8 items-center justify-center rounded-lg bg-surface-2"
                accessibilityLabel="Move contact down"
              >
                <Ionicons name="chevron-down" size={16} color="rgba(228,228,228,0.55)" />
              </Pressable>
              {contacts.length > 1 ? (
                <Pressable
                  onPress={() => removeContact(index)}
                  className="h-8 w-8 items-center justify-center rounded-lg bg-surface-2"
                  accessibilityLabel="Remove contact"
                >
                  <Ionicons name="trash-outline" size={16} color="rgba(228,228,228,0.55)" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <TextInput
            value={contact.phoneText}
            onChangeText={(value) =>
              updateContact(index, {
                phoneText: value,
                isAuthorSlot:
                  authorPhoneE164 !== null &&
                  tryParseArgentinaWhatsAppToE164(value) === authorPhoneE164,
              })
            }
            placeholder="WhatsApp number"
            placeholderTextColor={PLACEHOLDER_COLOR}
            keyboardType="phone-pad"
            className="h-14 rounded-xl border border-neutral/10 bg-surface-2 px-4 font-grotesk text-base text-neutral"
          />

          <TextInput
            value={contact.label}
            onChangeText={(value) => updateContact(index, { label: value })}
            placeholder="Label (optional), e.g. Juan, organizer"
            placeholderTextColor={PLACEHOLDER_COLOR}
            maxLength={40}
            className="h-14 rounded-xl border border-neutral/10 bg-surface-2 px-4 font-grotesk text-base text-neutral"
          />
        </View>
      ))}

      <View className="flex-row flex-wrap gap-2">
        {contacts.length < 3 ? (
          <Pressable
            onPress={addExtraContact}
            className="rounded-xl border border-neutral/10 bg-surface-1 px-4 py-3"
          >
            <Text className="font-grotesk text-sm font-semibold text-neutral/70">Add number</Text>
          </Pressable>
        ) : null}
        {authorPhoneE164 !== null &&
        !contacts.some((row) => row.isAuthorSlot) &&
        contacts.length < 3 ? (
          <Pressable
            onPress={addAuthorNumber}
            className="rounded-xl border border-neutral/10 bg-surface-1 px-4 py-3"
          >
            <Text className="font-grotesk text-sm font-semibold text-neutral/70">Add my number</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
