// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { State as GestureState } from 'react-native-gesture-handler';
import Animated, {
  EasingNode,
  type NodeParam,
  type SpringConfig,
  type TimingConfig,
} from 'react-native-reanimated';

import type { Shape } from 'lib/types/core.js';

/* eslint-disable import/no-named-as-default-member */
const {
  Clock,
  Node,
  Value,
  block,
  cond,
  not,
  and,
  or,
  greaterThan,
  lessThan,
  eq,
  neq,
  add,
  sub,
  divide,
  set,
  max,
  startClock,
  stopClock,
  clockRunning,
  timing,
  spring,
  SpringUtils,
} = Animated;
/* eslint-enable import/no-named-as-default-member */

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
  config?: Shape<TimingConfig>,
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

type SpringAnimationInitialState = Shape<{
  +velocity: Value | number,
}>;
function runSpring(
  clock: Clock,
  initialValue: Node | number,
  finalValue: Node | number,
  startStopClock: boolean = true,
  config?: Shape<SpringConfig>,
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

// You provide a node that performs a "ratchet",
// and this function will call it as keyboard height increases
function ratchetAlongWithKeyboardHeight(
  keyboardHeight: Node,
  ratchetFunction: NodeParam,
): Node {
  const prevKeyboardHeightValue = new Value(-1);
  const whenToUpdate = Platform.select({
    // In certain situations, iOS will send multiple keyboardShows in rapid
    // succession with increasing height values. Only the final value has any
    // semblance of reality. I've encountered this when using the native
    // password management integration
    default: greaterThan(keyboardHeight, max(prevKeyboardHeightValue, 0)),
  });
  const whenToReset = and(
    eq(keyboardHeight, 0),
    greaterThan(prevKeyboardHeightValue, 0),
  );
  return block([
    cond(
      lessThan(prevKeyboardHeightValue, 0),
      set(prevKeyboardHeightValue, keyboardHeight),
    ),
    cond(or(whenToUpdate, whenToReset), ratchetFunction),
    set(prevKeyboardHeightValue, keyboardHeight),
  ]);
}

function useReanimatedValueForBoolean(booleanValue: boolean): Value {
  const reanimatedValueRef = React.useRef();
  if (!reanimatedValueRef.current) {
    reanimatedValueRef.current = new Value(booleanValue ? 1 : 0);
  }
  const val = reanimatedValueRef.current;
  React.useEffect(() => {
    reanimatedValueRef.current?.setValue(booleanValue ? 1 : 0);
  }, [booleanValue]);
  return val;
}

// Target can be either 0 or 1. Caller handles interpolating
function animateTowards(
  target: Node,
  fullAnimationLength: number, // in ms
): Node {
  const curValue = new Value(-1);
  const prevTarget = new Value(-1);
  const clock = new Clock();

  const prevClockValue = new Value(0);
  const curDeltaClockValue = new Value(0);
  const deltaClockValue = [
    set(
      curDeltaClockValue,
      cond(eq(prevClockValue, 0), 0, sub(clock, prevClockValue)),
    ),
    set(prevClockValue, clock),
    curDeltaClockValue,
  ];
  const progressPerFrame = divide(deltaClockValue, fullAnimationLength);

  return block([
    [
      cond(eq(curValue, -1), set(curValue, target)),
      cond(eq(prevTarget, -1), set(prevTarget, target)),
    ],
    cond(neq(target, prevTarget), [stopClock(clock), set(prevTarget, target)]),
    cond(neq(curValue, target), [
      cond(not(clockRunning(clock)), [
        set(prevClockValue, 0),
        startClock(clock),
      ]),
      set(
        curValue,
        cond(
          eq(target, 1),
          add(curValue, progressPerFrame),
          sub(curValue, progressPerFrame),
        ),
      ),
    ]),
    [
      cond(greaterThan(curValue, 1), set(curValue, 1)),
      cond(lessThan(curValue, 0), set(curValue, 0)),
    ],
    cond(eq(curValue, target), [stopClock(clock)]),
    curValue,
  ]);
}

export {
  clamp,
  delta,
  gestureJustStarted,
  gestureJustEnded,
  runTiming,
  runSpring,
  ratchetAlongWithKeyboardHeight,
  useReanimatedValueForBoolean,
  animateTowards,
};
