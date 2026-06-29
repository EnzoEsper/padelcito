import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/tw';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AppAlertButton = {
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
};

type AppAlertPayload = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

type AppAlertContextValue = {
  alert: (title: string, message?: string, buttons?: AppAlertButton[]) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

let alertRef: AppAlertContextValue['alert'] | null = null;

/** Imperative alert for modules that cannot call hooks. Requires AppDialogProvider. */
export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
): void {
  if (alertRef === null) {
    throw new Error('showAppAlert called before AppDialogProvider mounted');
  }
  alertRef(title, message, buttons);
}

function resolveButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (buttons === undefined || buttons.length === 0) {
    return [{ text: 'OK', style: 'default' }];
  }
  return buttons;
}

function buttonClassName(style: AppAlertButtonStyle | undefined): string {
  switch (style) {
    case 'cancel':
      return 'bg-surface-3 border border-neutral/10';
    case 'destructive':
      return 'bg-warning/10 border border-warning/30';
    default:
      return 'bg-primary';
  }
}

function buttonTextClassName(style: AppAlertButtonStyle | undefined): string {
  switch (style) {
    case 'cancel':
      return 'text-neutral/75';
    case 'destructive':
      return 'text-warning';
    default:
      return 'text-neutral';
  }
}

type AppAlertDialogProps = {
  payload: AppAlertPayload;
  onDismiss: () => void;
};

function AppAlertDialog({ payload, onDismiss }: AppAlertDialogProps) {
  const { title, message, buttons } = payload;

  function handlePress(button: AppAlertButton): void {
    onDismiss();
    button.onPress?.();
  }

  function handleScrimPress(): void {
    const cancelButton = buttons.find((button) => button.style === 'cancel');
    if (cancelButton !== undefined) {
      handlePress(cancelButton);
      return;
    }

    if (buttons.length === 1) {
      handlePress(buttons[0]);
    }
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss} statusBarTranslucent>
      <RNPressable style={styles.scrim} onPress={handleScrimPress}>
        <RNPressable style={styles.card} onPress={() => undefined}>
          <Text className="font-grotesk font-bold text-lg text-neutral mb-2">{title}</Text>
          {message !== undefined && message.length > 0 ? (
            <Text className="font-grotesk text-[15px] leading-[22px] text-neutral/60 mb-5">
              {message}
            </Text>
          ) : (
            <View className="mb-5" />
          )}

          <View style={styles.buttonStack}>
            {buttons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                onPress={() => handlePress(button)}
                className={[
                  'h-12 rounded-xl items-center justify-center',
                  buttonClassName(button.style),
                ].join(' ')}
                accessibilityRole="button"
              >
                <Text
                  className={[
                    'font-grotesk font-semibold text-[15px]',
                    buttonTextClassName(button.style),
                  ].join(' ')}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<AppAlertPayload | null>(null);

  const alert = useCallback((title: string, message?: string, buttons?: AppAlertButton[]) => {
    setPayload({
      title,
      message,
      buttons: resolveButtons(buttons),
    });
  }, []);

  const dismiss = useCallback(() => {
    setPayload(null);
  }, []);

  useEffect(() => {
    alertRef = alert;
    return () => {
      alertRef = null;
    };
  }, [alert]);

  const value = useMemo<AppAlertContextValue>(() => ({ alert }), [alert]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      {payload !== null ? <AppAlertDialog payload={payload} onDismiss={dismiss} /> : null}
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertContextValue['alert'] {
  const context = useContext(AppAlertContext);
  if (context === null) {
    throw new Error('useAppAlert must be used within AppDialogProvider');
  }
  return context.alert;
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1B1C21',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.1)',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  buttonStack: {
    gap: 10,
  },
});
