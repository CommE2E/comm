// @flow

import Animated from 'react-native-reanimated';
import { State as GestureState } from 'react-native-gesture-handler';

const { Value, Clock, cond, greaterThan, eq, sub, set } = Animated;

function clamp(value: Value, minValue: Value, maxValue: Value): Value {
  return cond(
    greaterThan(value, maxValue),
    maxValue,
    cond(greaterThan(minValue, value), minValue, value),
  );
}

function delta(value: Value) {
  const prevValue = new Value(0);
  const deltaValue = new Value(0);
  return [
    set(deltaValue, cond(eq(prevValue, 0), 0, sub(value, prevValue))),
    set(prevValue, value),
    deltaValue,
  ];
}

function gestureJustStarted(state: Value) {
  const prevValue = new Value(-1);
  return cond(eq(prevValue, state), 0, [
    set(prevValue, state),
    eq(state, GestureState.ACTIVE),
  ]);
}

function gestureJustEnded(state: Value) {
  const prevValue = new Value(-1);
  return cond(eq(prevValue, state), 0, [
    set(prevValue, state),
    eq(state, GestureState.END),
  ]);
}

export { clamp, delta, gestureJustStarted, gestureJustEnded };
