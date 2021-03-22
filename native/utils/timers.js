// @flow

import { InteractionManager } from 'react-native';

function waitForInteractions(): Promise<void> {
  return new Promise(resolve => {
    InteractionManager.runAfterInteractions(resolve);
  });
}

function waitForAnimationFrameFlush(): Promise<number> {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
}

// As of React Native 0.63, there are a couple issues we experience when first
// rendering a TextInput with the autoFocus property set when that TextInput is
// inside a React Navigation modal. These issues occur even if we call focus
// inside the TextInput's ref instead of using the autoFocus property.
// (1) In some cases, KeyboardAvoidingView's first onLayout occurs with the
//     keyboard visible, which breaks its ability to resize correctly.
// (2) We get this crash from inside React Native's Animated stack sometimes
//     when running Android debug builds:
//     https://github.com/facebook/react-native/issues/29768
// We avoid both of these issues by waiting slightly before calling focus. Full
// context in D409.
function waitForModalInputFocus(): Promise<number> {
  return waitForAnimationFrameFlush();
}

export {
  waitForInteractions,
  waitForAnimationFrameFlush,
  waitForModalInputFocus,
};
