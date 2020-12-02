// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import {
  LongPressGestureHandler,
  TapGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';

import type { ViewStyle } from '../types/styles';
import {
  runTiming,
  useReanimatedValueForBoolean,
} from '../utils/animation-utils';

/* eslint-disable import/no-named-as-default-member */
const {
  Value,
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
} = Animated;
/* eslint-enable import/no-named-as-default-member */

const pressAnimationSpec = {
  duration: 150,
  easing: Easing.inOut(Easing.quad),
};
const resetAnimationSpec = {
  duration: 250,
  easing: Easing.inOut(Easing.quad),
};

type Props = {|
  +activeOpacity?: number,
  +onPress?: () => mixed,
  +onLongPress?: () => mixed,
  +children?: React.Node,
  +style?: ViewStyle,
  // If stickyActive is a boolean, we assume that we should stay active after a
  // successful onPress or onLongPress. We will wait for stickyActive to flip
  // from true to false before animating back to our deactivated mode.
  +stickyActive?: boolean,
  +overlay?: React.Node,
  +disabled?: boolean,
|};
function GestureTouchableOpacity(props: Props) {
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
  const { longPressEvent, tapEvent, transformStyle } = React.useMemo(() => {
    const longPressState = new Value(-1);
    const innerLongPressEvent = event([
      {
        nativeEvent: {
          state: longPressState,
        },
      },
    ]);
    const tapState = new Value(-1);
    const innerTapEvent = event([
      {
        nativeEvent: {
          state: tapState,
        },
      },
    ]);

    const gestureActive = or(
      eq(longPressState, GestureState.ACTIVE),
      eq(tapState, GestureState.BEGAN),
      eq(tapState, GestureState.ACTIVE),
      activeValue,
    );

    const tapSuccess = eq(tapState, GestureState.END);
    const prevTapSuccess = new Value(0);
    const longPressSuccess = eq(longPressState, GestureState.ACTIVE);
    const prevLongPressSuccess = new Value(0);

    const curOpacity = new Value(1);
    const pressClock = new Clock();
    const resetClock = new Clock();
    const opacity = block([
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
    const innerTransformStyle = {
      flex: 1,
      opacity,
    };

    return {
      longPressEvent: innerLongPressEvent,
      tapEvent: innerTapEvent,
      transformStyle: innerTransformStyle,
    };
  }, [
    onPress,
    onLongPress,
    activeOpacity,
    activeValue,
    disabledValue,
    stickyActiveEnabled,
  ]);

  const tapHandler = (
    <TapGestureHandler onHandlerStateChange={tapEvent} maxDurationMs={100000}>
      <Animated.View style={styles.fill}>
        <Animated.View style={[transformStyle, props.style]}>
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
    >
      <Animated.View style={styles.fill}>{tapHandler}</Animated.View>
    </LongPressGestureHandler>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

export default GestureTouchableOpacity;
