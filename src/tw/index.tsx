import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from "react-native-css";

import React from "react";
import {
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TouchableHighlight as RNTouchableHighlight,
  TextInput as RNTextInput,
  StyleSheet,
} from "react-native";
import { View, type ViewProps } from "./view";

export type { ViewProps };
export { View };

// CSS Variable hook — returns a live CSS variable value on native, var() string on web
export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

// Text
export type TextProps = React.ComponentProps<typeof RNText> & {
  className?: string;
};
export const Text = (props: TextProps) => {
  return useCssElement(RNText, props, { className: "style" });
};
Text.displayName = "CSS(Text)";

// ScrollView
export type ScrollViewProps = React.ComponentProps<typeof RNScrollView> & {
  className?: string;
  contentContainerClassName?: string;
};
export const ScrollView = (props: ScrollViewProps) => {
  return useCssElement(RNScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });
};
ScrollView.displayName = "CSS(ScrollView)";

// Pressable
export type PressableProps = React.ComponentProps<typeof RNPressable> & {
  className?: string;
};
export const Pressable = (props: PressableProps) => {
  return useCssElement(RNPressable, props, { className: "style" });
};
Pressable.displayName = "CSS(Pressable)";

// TextInput
export type TextInputProps = React.ComponentProps<typeof RNTextInput> & {
  className?: string;
};
export const TextInput = (props: TextInputProps) => {
  return useCssElement(RNTextInput, props, { className: "style" });
};
TextInput.displayName = "CSS(TextInput)";

// TouchableHighlight — extracts underlayColor from the flattened style object
// so react-native-css can pass it as a direct prop rather than a style entry.
function RawTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>
) {
  const { underlayColor, style, ...rest } = props;
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor}
      {...rest}
      style={StyleSheet.flatten(style) ?? {}}
    />
  );
}

export type TouchableHighlightProps = React.ComponentProps<
  typeof RNTouchableHighlight
> & { className?: string };
export const TouchableHighlight = (props: TouchableHighlightProps) => {
  return useCssElement(RawTouchableHighlight, props, { className: "style" });
};
TouchableHighlight.displayName = "CSS(TouchableHighlight)";

export { FlashList, type FlashListProps } from "./flash-list";
export { Image, ExpoImage, type ImageProps } from "./image";
export { Animated } from "./animated";
