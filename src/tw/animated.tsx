import RNAnimated from 'react-native-reanimated';
import { View } from './view';

export const Animated = {
  ...RNAnimated,
  View: RNAnimated.createAnimatedComponent(View),
};
