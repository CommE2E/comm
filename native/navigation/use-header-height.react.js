// @flow

import { getDefaultHeaderHeight } from '@react-navigation/elements';
import {
  useSafeAreaInsets,
  useSafeAreaFrame,
} from 'react-native-safe-area-context';

import { expandedHeight } from './disconnected-bar.react.js';
import { useSelector } from '../redux/redux-utils.js';

function useHeaderHeight(): number {
  const networkConnected = useSelector(state => state.connectivity.connected);
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const disconnectedBarHeight = networkConnected ? 0 : expandedHeight;

  return (
    getDefaultHeaderHeight(frame, false, insets.top) + disconnectedBarHeight
  );
}

export { useHeaderHeight };
