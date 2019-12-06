// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { BottomTabBar } from 'react-navigation-tabs';

import {
  type KeyboardState,
  withKeyboardState,
} from '../keyboard/keyboard-state';

type Props = {|
  ...React.ElementConfig<typeof BottomTabBar>,
  // withKeyboardState
  keyboardState: ?KeyboardState,
|};
function TabBar(props: Props) {
  const { keyboardState, ...rest } = props;
  if (
    Platform.OS === "android" &&
    keyboardState &&
    keyboardState.keyboardShowing
  ) {
    return null;
  }
  return <BottomTabBar {...rest} />;
}

export default withKeyboardState(TabBar);
