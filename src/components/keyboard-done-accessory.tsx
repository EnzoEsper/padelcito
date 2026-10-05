import { InputAccessoryView, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/tw';

export const KEYBOARD_DONE_ACCESSORY_ID = 'padelcito-keyboard-done';

/** iOS toolbar above phone/number pads so users can dismiss the keyboard. */
export function KeyboardDoneAccessory() {
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ACCESSORY_ID} backgroundColor="#2C2C2E">
      <View style={styles.bar}>
        <Pressable
          onPress={() => Keyboard.dismiss()}
          style={styles.doneButton}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2C2C2E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(228,228,228,0.18)',
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 16,
    color: '#5E70B8',
  },
});
