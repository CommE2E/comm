// @flow

import type { Dimensions } from 'lib/types/media-types';
import type { AppState } from '../redux/redux-setup';

import { createSelector } from 'reselect';

import { dimensionsSelector } from '../selectors/dimension-selectors';

// Keep sorta synced with styles.alignment/styles.messageBox in ComposedMessage
const composedMessageMaxWidthSelector: (
  state: AppState,
) => number = createSelector(
  dimensionsSelector,
  (dimensions: Dimensions): number => (dimensions.width - 24) * 0.80,
);

// Keep strictly synced with styles.message in TextMessage
const textMessageMaxWidthSelector: (state: AppState) => number = createSelector(
  composedMessageMaxWidthSelector,
  (composedMessageMaxWidth: number): number => composedMessageMaxWidth - 24,
);

export {
  composedMessageMaxWidthSelector,
  textMessageMaxWidthSelector,
};
