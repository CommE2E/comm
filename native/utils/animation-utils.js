// @flow

import * as React from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

function clampV2(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(Math.min(value, max), min);
}

function useSharedValueForBoolean(booleanValue: boolean): SharedValue<boolean> {
  const sharedValue = useSharedValue(booleanValue);
  React.useEffect(() => {
    sharedValue.value = booleanValue;
  }, [sharedValue, booleanValue]);
  return sharedValue;
}

export { clampV2, useSharedValueForBoolean };
