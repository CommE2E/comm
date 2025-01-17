// @flow

import * as React from 'react';
import { State as GestureState } from 'react-native-gesture-handler';
import Animated, {
  EasingNode,
  type SpringConfig,
  type TimingConfig,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const {
  Clock,
  Node,
  Value,
  block,
  cond,
  not,
  greaterThan,
  eq,
  sub,
  set,
  startClock,
  stopClock,
  clockRunning,
  timing,
  spring,
  SpringUtils,
} = Animated;

function clamp(
  value: Node,
  minValue: Node | number,
  maxValue: Node | number,
): Node {
  return cond(
    greaterThan(value, maxValue),
    maxValue,
    cond(greaterThan(minValue, value), minValue, value),
  );
}

function clampV2(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(Math.min(value, max), min);
}

function delta(value: Node): Node {
  const prevValue = new Value(0);
  const deltaValue = new Value(0);
  return block([
    set(deltaValue, cond(eq(prevValue, 0), 0, sub(value, prevValue))),
    set(prevValue, value),
    deltaValue,
  ]);
}

function gestureJustStarted(state: Node): Node {
  const prevValue = new Value(-1);
  return cond(eq(prevValue, state), 0, [
    set(prevValue, state),
    eq(state, GestureState.ACTIVE),
  ]);
}

function gestureJustEnded(state: Node): Node {
  const prevValue = new Value(-1);
  return cond(eq(prevValue, state), 0, [
    set(prevValue, state),
    eq(state, GestureState.END),
  ]);
}

const defaultTimingConfig = {
  duration: 250,
  easing: EasingNode.out(EasingNode.ease),
};

function runTiming(
  clock: Clock,
  initialValue: Node | number,
  finalValue: Node | number,
  startStopClock: boolean = true,
  config?: Partial<TimingConfig>,
): Node {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    frameTime: new Value(0),
    time: new Value(0),
  };
  const timingConfig = {
    ...defaultTimingConfig,
    ...config,
    toValue: new Value(0),
  };
  return block([
    cond(not(clockRunning(clock)), [
      set(state.finished, 0),
      set(state.frameTime, 0),
      set(state.time, 0),
      set(state.position, initialValue),
      set(timingConfig.toValue, finalValue),
      startStopClock ? startClock(clock) : undefined,
    ]),
    timing(clock, state, timingConfig),
    cond(state.finished, startStopClock ? stopClock(clock) : undefined),
    state.position,
  ]);
}

const defaultSpringConfig = SpringUtils.makeDefaultConfig();

type SpringAnimationInitialState = Partial<{
  +velocity: Value | number,
}>;
function runSpring(
  clock: Clock,
  initialValue: Node | number,
  finalValue: Node | number,
  startStopClock: boolean = true,
  config?: Partial<SpringConfig>,
  initialState?: SpringAnimationInitialState,
): Node {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    velocity: new Value(0),
    time: new Value(0),
  };
  const springConfig = {
    ...defaultSpringConfig,
    ...config,
    toValue: new Value(0),
  };
  return block([
    cond(not(clockRunning(clock)), [
      set(state.finished, 0),
      set(state.velocity, initialState?.velocity ?? 0),
      set(state.time, 0),
      set(state.position, initialValue),
      set(springConfig.toValue, finalValue),
      startStopClock ? startClock(clock) : undefined,
    ]),
    spring(clock, state, springConfig),
    cond(state.finished, startStopClock ? stopClock(clock) : undefined),
    state.position,
  ]);
}

function useSharedValueForBoolean(booleanValue: boolean): SharedValue<boolean> {
  const sharedValue = useSharedValue(booleanValue);
  React.useEffect(() => {
    sharedValue.value = booleanValue;
  }, [sharedValue, booleanValue]);
  return sharedValue;
}

export {
  clamp,
  clampV2,
  delta,
  gestureJustStarted,
  gestureJustEnded,
  runTiming,
  runSpring,
  useSharedValueForBoolean,
};
