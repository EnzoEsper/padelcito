import { useAppAlert } from '@/components/app-alert-dialog';

import {

  blockUserErrorMessage,

  useBlockUser,

} from '@/features/blocks/use-user-blocks';



type BlockUserOptions = {

  onBlocked?: () => void;

};



export function useBlockUserAction() {

  const appAlert = useAppAlert();

  const blockUser = useBlockUser();



  return (userId: string, displayName: string, options?: BlockUserOptions) => {

    appAlert(

      'Block user',

      `Block ${displayName}? They will be removed from any upcoming shared match with you (or you will be withdrawn), and they will no longer appear in your feeds. Unblocking does not restore past matches — they must request again.`,

      [

        { text: 'Cancel', style: 'cancel' },

        {

          text: 'Block',

          style: 'destructive',

          onPress: () => {

            void blockUser

              .mutateAsync(userId)

              .then(() => {

                options?.onBlocked?.();

              })

              .catch((error: unknown) => {

                appAlert('Could not block user', blockUserErrorMessage(error));

              });

          },

        },

      ],

    );

  };

}


