import { View, Text } from '@/tw';
import {
  CREATE_POST_BACK_TEXT_INSET,
} from '@/features/community/create-post/create-post-layout';

type CreatePostStepHeaderProps = {
  stepLabel: string;
  title: string;
  subtitle?: string;
};

export function CreatePostStepHeader({
  stepLabel,
  title,
  subtitle,
}: CreatePostStepHeaderProps) {
  return (
    <View className="mb-7">
      <View
        style={{ height: 44, justifyContent: 'center', paddingLeft: CREATE_POST_BACK_TEXT_INSET }}
        className="mb-1"
      >
        <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
          {stepLabel}
        </Text>
      </View>
      <Text
        className="font-grotesk font-extrabold text-[30px] text-neutral"
        style={{ letterSpacing: -0.8 }}
      >
        {title}
      </Text>
      {subtitle !== undefined && subtitle.length > 0 ? (
        <Text className="font-grotesk text-sm text-neutral/60 mt-2 leading-5">{subtitle}</Text>
      ) : null}
    </View>
  );
}
