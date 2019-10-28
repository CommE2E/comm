// @flow

import Animated from 'react-native-reanimated';

const {
  Value,
  Clock,
  cond,
  greaterThan,
  eq,
  sub,
  set,
} = Animated;

function clamp(value: Value, minValue: Value, maxValue: Value): Value {
  return cond(
    greaterThan(value, maxValue),
    maxValue,
    cond(
      greaterThan(minValue, value),
      minValue,
      value,
    ),
  );
}

function delta(value: Value) {
  const prevValue = new Value(0);
  const deltaValue = new Value(0);
  return [
    set(
      deltaValue,
      cond(
        eq(prevValue, 0),
        0,
        sub(value, prevValue),
      ),
    ),
    set(prevValue, value),
    deltaValue,
  ];
}

export {
  clamp,
  delta,
};
