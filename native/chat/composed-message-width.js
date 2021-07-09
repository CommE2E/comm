// @flow

import { createSelector } from 'reselect';

import type { DimensionsInfo } from '../redux/dimensions-updater.react';
import type { AppState } from '../redux/state-types';

// Keep sorta synced with styles.alignment/styles.messageBox in ComposedMessage
const composedMessageMaxWidthSelector: (
  state: AppState,
) => number = createSelector(
  (state: AppState) => state.dimensions,
  (dimensionsInfo: DimensionsInfo): number => {
    const windowWidth = dimensionsInfo.rotated
      ? dimensionsInfo.height
      : dimensionsInfo.width;
    return (windowWidth - 24) * 0.8;
  },
);

export { composedMessageMaxWidthSelector };
