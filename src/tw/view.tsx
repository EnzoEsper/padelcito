import { useCssElement } from 'react-native-css';
import React from 'react';
import { View as RNView } from 'react-native';

export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps) => {
  return useCssElement(RNView, props, { className: 'style' });
};
View.displayName = 'CSS(View)';
