import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable as RNPressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/tw';

const HORIZONTAL_PADDING = 20;
const ROW_HEIGHT = 52;
const HEADER_BLOCK = 76;
const HANDLE_BLOCK = 18;
const LIST_PADDING = 12;

export type OptionSelectItem<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

type OptionSelectSheetProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: readonly OptionSelectItem<T>[];
  value: T;
  onSelect: (value: T) => void;
};

/** Compact picker sheet for form fields — radio list, fixed header, reliable close. */
export function OptionSelectSheet<T extends string>({
  visible,
  onClose,
  title,
  subtitle,
  options,
  value,
  onSelect,
}: OptionSelectSheetProps<T>) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const sheetHeight = useMemo(() => {
    const bottomInset = Math.max(insets.bottom, 16);
    const listHeight = options.length * ROW_HEIGHT + LIST_PADDING * 2;
    const naturalHeight = HANDLE_BLOCK + HEADER_BLOCK + listHeight + bottomInset;
    const maxHeight = Math.round(windowHeight * 0.58);
    return Math.min(Math.max(naturalHeight, 220), maxHeight);
  }, [insets.bottom, options.length, windowHeight]);

  function handleSelect(next: T): void {
    onSelect(next);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <RNPressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
        />

        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.handle} accessibilityElementsHidden />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle !== undefined ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="rgba(228,228,228,0.55)" />
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={options.length > 6}
          >
            <View style={styles.optionGroup}>
              {options.map((option, index) => {
                const selected = option.value === value;
                const isLast = index === options.length - 1;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    style={[styles.optionRow, !isLast ? styles.optionRowBorder : null]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.label}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                      {option.description !== undefined ? (
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      ) : null}
                    </View>

                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? (
                        <Ionicons name="checkmark" size={14} color="#E4E4E4" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export type OptionSelectFieldProps<T extends string> = {
  sheetTitle: string;
  sheetSubtitle?: string;
  value: T;
  options: readonly OptionSelectItem<T>[];
  onChange: (value: T) => void;
  embedded?: boolean;
  showDivider?: boolean;
  flexClass?: string;
  placeholder?: string;
};

/** Trigger field + option sheet — reusable across forms. */
export function OptionSelectField<T extends string>({
  sheetTitle,
  sheetSubtitle,
  value,
  options,
  onChange,
  embedded = false,
  showDivider = false,
  flexClass = 'flex-1',
  placeholder = 'Select',
}: OptionSelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={[
          flexClass,
          embedded
            ? 'min-h-14 px-3 flex-row items-center justify-between gap-1'
            : 'h-14 rounded-xl bg-surface-1 border border-neutral/10 px-4 flex-row items-center justify-between gap-1',
          showDivider ? 'border-r border-neutral/10' : '',
        ].join(' ')}
        accessibilityRole="button"
        accessibilityLabel={`${sheetTitle}: ${selectedLabel ?? placeholder}`}
        accessibilityHint="Opens options"
      >
        <Text
          className={[
            'font-grotesk text-sm flex-1',
            selectedLabel !== undefined ? 'text-neutral' : 'text-neutral/45',
          ].join(' ')}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="rgba(228,228,228,0.38)" />
      </Pressable>

      <OptionSelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        options={options}
        value={value}
        onSelect={onChange}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    backgroundColor: '#141417',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(228,228,228,0.10)',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(228,228,228,0.18)',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: '#E4E4E4',
  },
  subtitle: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(228,228,228,0.55)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228,228,228,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.08)',
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(228,228,228,0.10)',
    marginHorizontal: HORIZONTAL_PADDING,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: LIST_PADDING,
    paddingBottom: LIST_PADDING,
  },
  optionGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1B1C21',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.10)',
  },
  optionRow: {
    minHeight: ROW_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(228,228,228,0.08)',
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(228,228,228,0.78)',
  },
  optionLabelSelected: {
    fontFamily: 'HankenGrotesk-Bold',
    color: '#E4E4E4',
  },
  optionDescription: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(228,228,228,0.45)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(228,228,228,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  radioSelected: {
    borderColor: '#5E70B8',
    backgroundColor: '#2B396D',
  },
});
