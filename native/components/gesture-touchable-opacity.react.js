// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useSharedValue,
  runOnJS,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import type { AnimatedViewStyle, ViewStyle } from '../types/styles.js';
import { useSharedValueForBoolean } from '../utils/animation-utils.js';

const pressAnimationSpec = {
  duration: 150,
  easing: Easing.inOut(Easing.quad),
};
const resetAnimationSpec = {
  duration: 250,
  easing: Easing.inOut(Easing.quad),
};

type Props = {
  +activeOpacity?: number,
  +onPress?: () => mixed,
  +onLongPress?: () => mixed,
  +children?: React.Node,
  +style?: ViewStyle,
  +animatedStyle?: AnimatedViewStyle,
  // If stickyActive is a boolean, we assume that we should stay active after a
  // successful onPress or onLongPress. We will wait for stickyActive to flip
  // from true to false before animating back to our deactivated mode.
  +stickyActive?: boolean,
  +overlay?: React.Node,
  +disabled?: boolean,
};
function GestureTouchableOpacity(props: Props): React.Node {
  const { onPress: innerOnPress, onLongPress: innerOnLongPress } = props;
  const onPress = React.useCallback(() => {
    innerOnPress && innerOnPress();
  }, [innerOnPress]);
  const onLongPress = React.useCallback(() => {
    innerOnLongPress && innerOnLongPress();
  }, [innerOnLongPress]);
  const activeOpacity = props.activeOpacity ?? 0.2;

  const { stickyActive, disabled } = props;
  const activeValue = useSharedValueForBoolean(!!stickyActive);
  const stickyActiveEnabled =
    stickyActive !== null && stickyActive !== undefined;

  const gesturePending = useSharedValue(false);
  const longPressGesture = React.useMemo(() => {
    if (!innerOnLongPress) {
      return null;
    }
    return Gesture.LongPress()
      .enabled(!disabled)
      .minDuration(370)
      .maxDistance(50)
      .onBegin(() => {
        gesturePending.value = true;
      })
      .onStart(() => {
        if (stickyActiveEnabled) {
          activeValue.value = true;
        }
        runOnJS(onLongPress)();
      })
      .onTouchesCancelled(() => {
        gesturePending.value = false;
      })
      .onFinalize(() => {
        gesturePending.value = false;
      });
  }, [
    disabled,
    activeValue,
    innerOnLongPress,
    onLongPress,
    stickyActiveEnabled,
    gesturePending,
  ]);

  const tapGesture = React.useMemo(
    () =>
      Gesture.Tap()
        .enabled(!disabled)
        .maxDuration(100000)
        .maxDistance(50)
        .onBegin(() => {
          gesturePending.value = true;
        })
        .onEnd(() => {
          if (stickyActiveEnabled) {
            activeValue.value = true;
          }
          runOnJS(onPress)();
        })
        .onTouchesCancelled(() => {
          gesturePending.value = false;
        })
        .onFinalize(() => {
          gesturePending.value = false;
        }),
    [disabled, activeValue, onPress, stickyActiveEnabled, gesturePending],
  );

  const curOpacity = useSharedValue(1);

  const transformStyle = useAnimatedStyle(() => {
    const gestureActive = gesturePending.value || activeValue.value;
    if (gestureActive) {
      curOpacity.value = withTiming(activeOpacity, pressAnimationSpec);
    } else {
      curOpacity.value = withTiming(1, resetAnimationSpec);
    }
    return { opacity: curOpacity.value };
  });

  const fillStyle = React.useMemo(() => {
    const result = StyleSheet.flatten<ViewStyle>(props.style);
    if (!result) {
      return undefined;
    }
    const { flex } = result;
    if (flex === null || flex === undefined) {
      return undefined;
    }
    return { flex };
  }, [props.style]);

  const composedGesture = React.useMemo(() => {
    if (!longPressGesture) {
      return tapGesture;
    }
    return Gesture.Exclusive(longPressGesture, tapGesture);
  }, [longPressGesture, tapGesture]);

  const childrenWrapperView = React.useMemo(
    () => [transformStyle, props.style, props.animatedStyle],
    [transformStyle, props.style, props.animatedStyle],
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={fillStyle}>
        <Animated.View style={childrenWrapperView}>
          {props.children}
        </Animated.View>
        {props.overlay}
      </Animated.View>
    </GestureDetector>
  );
}

export default GestureTouchableOpacity;
