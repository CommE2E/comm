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

// Keep strictly synced with styles.message in TextMessage
const textMessageMaxWidthSelector: (state: AppState) => number = createSelector(
  composedMessageMaxWidthSelector,
  (composedMessageMaxWidth: number): number => composedMessageMaxWidth - 24,
);

export { composedMessageMaxWidthSelector, textMessageMaxWidthSelector };
