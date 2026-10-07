import { createContext, useContext, type ReactNode } from 'react';
import { useCreatePostForm } from '@/features/community/create-post/use-create-post-form';

type CreatePostFormContextValue = ReturnType<typeof useCreatePostForm>;

const CreatePostFormContext = createContext<CreatePostFormContextValue | null>(null);

export function CreatePostFormProvider({ children }: { children: ReactNode }) {
  const form = useCreatePostForm();
  return (
    <CreatePostFormContext.Provider value={form}>{children}</CreatePostFormContext.Provider>
  );
}

export function useCreatePostFormContext(): CreatePostFormContextValue {
  const value = useContext(CreatePostFormContext);
  if (value === null) {
    throw new Error('useCreatePostFormContext must be used within CreatePostFormProvider');
  }
  return value;
}
