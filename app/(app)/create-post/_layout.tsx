import { Stack } from 'expo-router';
import { CreatePostFormProvider } from '@/features/community/create-post/create-post-form-context';
import { CreatePostPublishLimitsPrefetch } from '@/features/community/create-post/components/create-post-publish-limits-prefetch';

export default function CreatePostLayout() {
  return (
    <CreatePostFormProvider>
      <CreatePostPublishLimitsPrefetch />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="details" />
        <Stack.Screen name="review" />
      </Stack>
    </CreatePostFormProvider>
  );
}
