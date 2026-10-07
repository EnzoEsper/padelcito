import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import { getErrorMessage } from '@/lib/error-message';
import { logger } from '@/lib/logger';
import {
  useAttachPostImage,
  useCommunityPublishLimits,
  useCreatePost,
  useProfileContactGate,
} from '@/features/community/use-posts';
import { buildMyPostsRoute } from '@/features/community/post-display';
import { usePhoneVerification } from '@/features/profile/phone-verification-provider';
import { uploadPostImage } from '@/lib/post-storage';
import type { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';
import type { CreatePostValidationFailure } from '@/features/community/create-post/create-post-validation';
import { validationSectionToPanel } from '@/features/community/create-post/create-post-form-summaries';

type Form = ReturnType<typeof useCreatePostForm>;

type CreatePostPublishButtonProps = {
  form: Form;
  onValidationFailed?: (failure: CreatePostValidationFailure) => void;
};

export function CreatePostPublishButton({
  form,
  onValidationFailed,
}: CreatePostPublishButtonProps) {
  const router = useRouter();
  const createPost = useCreatePost();
  const attachPostImage = useAttachPostImage();
  const contactGate = useProfileContactGate();
  const publishLimits = useCommunityPublishLimits();
  const { requireVerifiedWhatsApp } = usePhoneVerification();
  const appAlert = useAppAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPublish(): Promise<void> {
    if (isSubmitting) return;

    const phone = contactGate.data?.whatsappPhone ?? '';
    if (phone.length === 0 || contactGate.data?.whatsappVerified !== true) {
      return;
    }

    const result = form.buildSubmitInput();
    if (!result.ok) {
      const panel = validationSectionToPanel(result.section);
      if (panel !== null) {
        form.expandPanel(panel);
      }
      onValidationFailed?.(result);
      appAlert('Cannot publish', result.message);
      return;
    }

    if (form.imageUri !== null && form.imageBase64 === null) {
      appAlert('Image upload issue', 'Re-select your post image and try again.');
      return;
    }

    const limits = publishLimits.data;
    if (limits !== undefined && !limits.canPublish) {
      if (limits.pendingReviewBlocked) {
        appAlert(
          'Moderation queue full',
          'You already have two posts waiting for review. This submission was not sent. Check My posts — a previous tap may have succeeded.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'My posts', onPress: () => router.push(buildMyPostsRoute()) },
          ],
        );
      } else {
        appAlert(
          'Daily limit reached',
          'You can submit at most five community posts every 24 hours. Try again later.',
        );
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const postId = await createPost.mutateAsync({
        type: result.input.type,
        subtype: result.input.subtype,
        subtypeNote: result.input.subtypeNote,
        tags: result.input.tags,
        scoringFormat: result.input.scoringFormat,
        goldenPoint: result.input.goldenPoint,
        guaranteedMatches: result.input.guaranteedMatches,
        rulesNote: result.input.rulesNote,
        rulesImages: result.input.rulesImages,
        entryFee: result.input.entryFee,
        feeUnit: result.input.feeUnit,
        registrationDeadline: result.input.registrationDeadline,
        divisions: result.input.divisions,
        title: result.input.title,
        description: result.input.description,
        imagePath: null,
        venueName: result.input.venueName,
        formattedAddress: result.input.formattedAddress,
        coords: result.input.coords,
        eventStart: result.input.eventStart,
        eventEnd: result.input.eventEnd,
        contacts: result.input.contacts,
      });

      if (form.imageBase64 !== null && form.imageMimeType !== null) {
        const userId = contactGate.data?.userId;
        if (userId === undefined) {
          throw new Error('Not authenticated');
        }

        const imagePath = await uploadPostImage(
          userId,
          form.imageBase64,
          form.imageMimeType,
        );
        await attachPostImage.mutateAsync({ postId, imagePath });
      }

      form.reset();

      appAlert(
        'Submitted for review',
        'Your post was sent to moderation. You will be notified when it is approved.',
        [{ text: 'OK', onPress: () => router.replace(`/(app)/post-detail?id=${postId}`) }],
      );
    } catch (error) {
      logger.error('publish post failed', error);
      const message = getErrorMessage(error, 'Could not publish post.');
      appAlert('Publish failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePublish(): void {
    if (isSubmitting) return;
    if (contactGate.data?.isBanned === true) {
      appAlert('Cannot publish', 'Your account cannot publish community posts.');
      return;
    }

    const phone = contactGate.data?.whatsappPhone ?? '';
    if (phone.length === 0) {
      appAlert(
        'WhatsApp required',
        'Add your WhatsApp number to your profile before publishing a post.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to profile',
            onPress: () => router.push('/(app)/profile'),
          },
        ],
      );
      return;
    }

    requireVerifiedWhatsApp(() => {
      void submitPublish();
    });
  }

  const publishBlocked = publishLimits.data?.canPublish === false;

  return (
    <Pressable
      onPress={handlePublish}
      disabled={isSubmitting || publishBlocked}
      className="h-14 rounded-2xl bg-primary border border-primary-hi items-center justify-center flex-1"
      style={{ opacity: isSubmitting || publishBlocked ? 0.7 : 1 }}
    >
      <Text className="font-grotesk text-base font-bold text-neutral">
        {isSubmitting ? 'Submitting…' : 'Submit for review'}
      </Text>
    </Pressable>
  );
}
