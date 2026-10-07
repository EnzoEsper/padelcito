import { useEffect } from 'react';
import { useNavigation } from 'expo-router';
import { useAppAlert } from '@/components/app-alert-dialog';

type BeforeRemoveEvent = {
  preventDefault: () => void;
  data: {
    action: { type: string; payload?: object; source?: string; target?: string };
  };
};

export function useCreatePostDiscardGuard(enabled: boolean): void {
  const navigation = useNavigation();
  const appAlert = useAppAlert();

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = navigation.addListener('beforeRemove', (event: BeforeRemoveEvent) => {
      const actionType = event.data.action.type;
      if (actionType !== 'GO_BACK' && actionType !== 'POP') {
        return;
      }

      event.preventDefault();
      appAlert('Discard post?', 'Your changes will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });

    return unsubscribe;
  }, [enabled, navigation, appAlert]);
}
