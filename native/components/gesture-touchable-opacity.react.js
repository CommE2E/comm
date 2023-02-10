// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import {
  LongPressGestureHandler,
  TapGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import Animated, { EasingNode } from 'react-native-reanimated';

import type { AnimatedViewStyle, ViewStyle } from '../types/styles.js';
import {
  runTiming,
  useReanimatedValueForBoolean,
} from '../utils/animation-utils.js';

/* eslint-disable import/no-named-as-default-member */
const {
  Clock,
  block,
  event,
  set,
  call,
  cond,
  not,
  and,
  or,
  eq,
  stopClock,
  clockRunning,
  useValue,
} = Animated;
/* eslint-enable import/no-named-as-default-member */

const pressAnimationSpec = {
  duration: 150,
  easing: EasingNode.inOut(EasingNode.quad),
};
const resetAnimationSpec = {
  duration: 250,
  easing: EasingNode.inOut(EasingNode.quad),
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
  ref: React.Ref<typeof TapGestureHandler>,
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
  const activeValue = useReanimatedValueForBoolean(!!stickyActive);
  const disabledValue = useReanimatedValueForBoolean(!!disabled);
  const stickyActiveEnabled =
    stickyActive !== null && stickyActive !== undefined;

  const longPressState = useValue(-1);
  const tapState = useValue(-1);
  const longPressEvent = React.useMemo(
    () =>
      event([
        {
          nativeEvent: {
            state: longPressState,
          },
        },
      ]),
    [longPressState],
  );
  const tapEvent = React.useMemo(
    () =>
      event([
        {
          nativeEvent: {
            state: tapState,
          },
        },
      ]),
    [tapState],
  );
  const gestureActive = React.useMemo(
    () =>
      or(
        eq(longPressState, GestureState.ACTIVE),
        eq(tapState, GestureState.BEGAN),
        eq(tapState, GestureState.ACTIVE),
        activeValue,
      ),
    [longPressState, tapState, activeValue],
  );

  const curOpacity = useValue(1);

  const pressClockRef = React.useRef();
  if (!pressClockRef.current) {
    pressClockRef.current = new Clock();
  }
  const pressClock = pressClockRef.current;
  const resetClockRef = React.useRef();
  if (!resetClockRef.current) {
    resetClockRef.current = new Clock();
  }
  const resetClock = resetClockRef.current;

  const animationCode = React.useMemo(
    () => [
      cond(or(gestureActive, clockRunning(pressClock)), [
        set(
          curOpacity,
          runTiming(
            pressClock,
            curOpacity,
            activeOpacity,
            true,
            pressAnimationSpec,
          ),
        ),
        stopClock(resetClock),
      ]),
      // We have to do two separate conds here even though the condition is the
      // same because if runTiming stops the pressClock, we need to immediately
      // start the resetClock or Reanimated won't keep running the code because
      // it will think there is nothing left to do
      cond(
        not(or(gestureActive, clockRunning(pressClock))),
        set(
          curOpacity,
          runTiming(resetClock, curOpacity, 1, true, resetAnimationSpec),
        ),
      ),
    ],
    [gestureActive, curOpacity, pressClock, resetClock, activeOpacity],
  );

  const prevTapSuccess = useValue(0);
  const prevLongPressSuccess = useValue(0);

  const transformStyle = React.useMemo(() => {
    const tapSuccess = eq(tapState, GestureState.END);
    const longPressSuccess = eq(longPressState, GestureState.ACTIVE);
    const opacity = block([
      ...animationCode,
      [
        cond(and(tapSuccess, not(prevTapSuccess), not(disabledValue)), [
          stickyActiveEnabled ? set(activeValue, 1) : undefined,
          call([], onPress),
        ]),
        set(prevTapSuccess, tapSuccess),
      ],
      [
        cond(
          and(longPressSuccess, not(prevLongPressSuccess), not(disabledValue)),
          [
            stickyActiveEnabled ? set(activeValue, 1) : undefined,
            call([], onLongPress),
          ],
        ),
        set(prevLongPressSuccess, longPressSuccess),
      ],
      curOpacity,
    ]);
    return { opacity };
  }, [
    animationCode,
    tapState,
    longPressState,
    prevTapSuccess,
    prevLongPressSuccess,
    curOpacity,
    onPress,
    onLongPress,
    activeValue,
    disabledValue,
    stickyActiveEnabled,
  ]);

  const fillStyle = React.useMemo(() => {
    const result = StyleSheet.flatten(props.style);
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

const GestureTouchableOpacity: React.AbstractComponent<
  Props,
  TapGestureHandler,
> = React.forwardRef<Props, TapGestureHandler>(
  ForwardedGestureTouchableOpacity,
);
GestureTouchableOpacity.displayName = 'GestureTouchableOpacity';

export default GestureTouchableOpacity;
