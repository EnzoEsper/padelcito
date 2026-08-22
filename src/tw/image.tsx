import { useCssElement } from 'react-native-css';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Image as RNImage, type ImageProps as ExpoImageProps } from 'expo-image';

export type ImageProps = ExpoImageProps & { className?: string };

function CSSImage(props: ImageProps) {
  const { className: _className, style, contentFit, contentPosition, ...rest } = props;
  const flattened = StyleSheet.flatten(style) ?? {};
  const { objectFit, objectPosition, ...resolvedStyle } = flattened as Record<string, unknown>;

  return (
    <RNImage
      {...rest}
      contentFit={contentFit ?? (objectFit as ExpoImageProps['contentFit'])}
      contentPosition={contentPosition ?? (objectPosition as ExpoImageProps['contentPosition'])}
      style={resolvedStyle}
    />
  );
}

export const Image = (props: ImageProps) => {
  return useCssElement(CSSImage, props, { className: 'style' });
};
Image.displayName = 'CSS(Image)';

export { RNImage as ExpoImage };
