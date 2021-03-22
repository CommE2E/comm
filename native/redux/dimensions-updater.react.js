// @flow

import * as React from 'react';
import {
  initialWindowMetrics,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import type { Dimensions } from 'lib/types/media-types';

import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
  androidKeyboardResizesFrame,
  rnsacThinksAndroidKeyboardResizesFrame,
} from '../keyboard/keyboard';
import { updateDimensionsActiveType } from './action-types';
import { useSelector } from './redux-utils';

type BaseDimensionsInfo = {|
  ...Dimensions,
  +topInset: number,
  +bottomInset: number,
|};
export type DimensionsInfo = {|
  ...BaseDimensionsInfo,
  +tabBarHeight: number,
  +rotated: boolean,
|};

type Metrics = {|
  +frame: {| +x: number, +y: number, +width: number, +height: number |},
  +insets: {| +top: number, +left: number, +right: number, +bottom: number |},
|};
function dimensionsUpdateFromMetrics(metrics: ?Metrics): BaseDimensionsInfo {
  if (!metrics) {
    // This happens when the app gets booted to run a background task
    return { height: 0, width: 0, topInset: 0, bottomInset: 0 };
  }
  return {
    height: metrics.frame.height,
    width: metrics.frame.width,
    topInset: androidKeyboardResizesFrame ? 0 : metrics.insets.top,
    bottomInset: androidKeyboardResizesFrame ? 0 : metrics.insets.bottom,
  };
}

const defaultDimensionsInfo = {
  ...dimensionsUpdateFromMetrics(initialWindowMetrics),
  tabBarHeight: 50,
  rotated: false,
};
const defaultIsPortrait =
  defaultDimensionsInfo.height >= defaultDimensionsInfo.width;

function DimensionsUpdater() {
  const dimensions = useSelector(state => state.dimensions);
  const dispatch = useDispatch();

  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();

  const keyboardShowingRef = React.useRef();
  const keyboardShow = React.useCallback(() => {
    keyboardShowingRef.current = true;
  }, []);
  const keyboardDismiss = React.useCallback(() => {
    keyboardShowingRef.current = false;
  }, []);
  React.useEffect(() => {
    if (!rnsacThinksAndroidKeyboardResizesFrame) {
      return;
    }
    const showListener = addKeyboardShowListener(keyboardShow);
    const dismissListener = addKeyboardDismissListener(keyboardDismiss);
    return () => {
      removeKeyboardListener(showListener);
      removeKeyboardListener(dismissListener);
    };
  }, [keyboardShow, keyboardDismiss]);
  const keyboardShowing = keyboardShowingRef.current;

  React.useEffect(() => {
    if (keyboardShowing) {
      return;
    }
    let updates = dimensionsUpdateFromMetrics({ frame, insets });
    if (updates.height && updates.width && updates.height !== updates.width) {
      updates = {
        ...updates,
        rotated: updates.width > updates.height === defaultIsPortrait,
      };
    }
    for (const key in updates) {
      if (updates[key] === dimensions[key]) {
        continue;
      }
      dispatch({
        type: updateDimensionsActiveType,
        payload: updates,
      });
      return;
    }
  }, [keyboardShowing, dimensions, dispatch, frame, insets]);

  return null;
}

export { defaultDimensionsInfo, DimensionsUpdater };
