// @flow

import Animated from 'react-native-reanimated';

const {
  Value,
  Clock,
  cond,
  greaterThan,
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

export {
  clamp,
};
