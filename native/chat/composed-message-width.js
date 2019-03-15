// @flow

import type { Dimensions } from 'lib/types/media-types';

import { createSelector } from 'reselect';

import { dimensionsSelector } from '../selectors/dimension-selectors';

// Keep sorta synced with styles.alignment/styles.messageBox in ComposedMessage
const composedMessageMaxWidthSelector = createSelector<*, *, *, *>(
  dimensionsSelector,
  (dimensions: Dimensions): number => (dimensions.width - 24) * 0.80,
);

// Keep strictly synced with styles.message in TextMessage
const textMessageMaxWidthSelector = createSelector<*, *, *, *>(
  composedMessageMaxWidthSelector,
  (composedMessageMaxWidth: number): number => composedMessageMaxWidth - 24,
);

export {
  composedMessageMaxWidthSelector,
  textMessageMaxWidthSelector,
};
