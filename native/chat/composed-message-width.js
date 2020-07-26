// @flow

import type { AppState } from '../redux/redux-setup';

import { createSelector } from 'reselect';

// Keep sorta synced with styles.alignment/styles.messageBox in ComposedMessage
const composedMessageMaxWidthSelector: (
  state: AppState,
) => number = createSelector(
  (state: AppState) => state.dimensions.width,
  (windowWidth: number): number => (windowWidth - 24) * 0.8,
);

export { composedMessageMaxWidthSelector };
