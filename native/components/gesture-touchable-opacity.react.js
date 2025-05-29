// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import {
  LongPressGestureHandler,
  TapGestureHandler,
  State as GestureState,
  type LongPressGestureEvent,
  type TapGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedGestureHandler,
  runOnJS,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import type { ReactRefSetter } from 'lib/types/react-types.js';

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
function ForwardedGestureTouchableOpacity(
  props: Props,
  ref: ReactRefSetter<TapGestureHandler>,
) {
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
  const disabledValue = useSharedValueForBoolean(!!disabled);
  const stickyActiveEnabled =
    stickyActive !== null && stickyActive !== undefined;

  const longPressState = useSharedValue(-1);
  const tapState = useSharedValue(-1);
  const longPressEvent = useAnimatedGestureHandler<LongPressGestureEvent>(
    {
      onStart: () => {
        longPressState.value = GestureState.BEGAN;
      },
      onActive: () => {
        longPressState.value = GestureState.ACTIVE;
        if (disabledValue.value) {
          return;
        }
        if (stickyActiveEnabled) {
          activeValue.value = true;
        }
        runOnJS(onLongPress)();
      },
      onEnd: () => {
        longPressState.value = GestureState.END;
      },
      onFail: () => {
        longPressState.value = GestureState.FAILED;
      },
      onCancel: () => {
        longPressState.value = GestureState.CANCELLED;
      },
      onFinish: () => {
        longPressState.value = GestureState.END;
      },
    },
    [stickyActiveEnabled, onLongPress],
  );
  const tapEvent = useAnimatedGestureHandler<TapGestureEvent>(
    {
      onStart: () => {
        tapState.value = GestureState.BEGAN;
      },
      onActive: () => {
        tapState.value = GestureState.ACTIVE;
      },
      onEnd: () => {
        tapState.value = GestureState.END;
        if (disabledValue.value) {
          return;
        }
        if (stickyActiveEnabled) {
          activeValue.value = true;
        }
        runOnJS(onPress)();
      },
      onFail: () => {
        tapState.value = GestureState.FAILED;
      },
      onCancel: () => {
        tapState.value = GestureState.CANCELLED;
      },
      onFinish: () => {
        tapState.value = GestureState.END;
      },
    },
    [stickyActiveEnabled, onPress],
  );

  const curOpacity = useSharedValue(1);

  const transformStyle = useAnimatedStyle(() => {
    const gestureActive =
      longPressState.value === GestureState.ACTIVE ||
      tapState.value === GestureState.BEGAN ||
      tapState.value === GestureState.ACTIVE ||
      activeValue.value;
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

  const tapHandler = (
    <TapGestureHandler
      onHandlerStateChange={tapEvent}
      maxDurationMs={100000}
      maxDist={50}
      ref={ref}
    >
      <Animated.View style={fillStyle}>
        <Animated.View
          style={[transformStyle, props.style, props.animatedStyle]}
        >
          {props.children}
        </Animated.View>
        {props.overlay}
      </Animated.View>
    </TapGestureHandler>
  );
  if (!innerOnLongPress) {
    return tapHandler;
  }

  return (
    <LongPressGestureHandler
      onHandlerStateChange={longPressEvent}
      minDurationMs={370}
      maxDist={50}
    >
      <Animated.View style={fillStyle}>{tapHandler}</Animated.View>
    </LongPressGestureHandler>
  );
}

const GestureTouchableOpacity: React.ComponentType<Props> = React.forwardRef<
  Props,
  TapGestureHandler,
>(ForwardedGestureTouchableOpacity);
GestureTouchableOpacity.displayName = 'GestureTouchableOpacity';

export default GestureTouchableOpacity;
