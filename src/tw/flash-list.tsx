import { useCssElement } from 'react-native-css';
import { FlashList as RNFlashList, type FlashListProps as RNFlashListProps } from '@shopify/flash-list';
import type React from 'react';

export type FlashListProps<T> = RNFlashListProps<T> & {
  className?: string;
  contentContainerClassName?: string;
};

function CSSFlashList<T>(props: FlashListProps<T>) {
  const { className: _className, contentContainerClassName: _contentContainerClassName, ...rest } =
    props;
  return <RNFlashList {...rest} />;
}

export function FlashList<T>(props: FlashListProps<T>) {
  // @ts-expect-error TS2590: FlashList props create a union type too complex for StyledConfiguration inference
  return useCssElement(CSSFlashList, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
}

FlashList.displayName = 'CSS(FlashList)';
