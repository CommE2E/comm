// @flow

import type { AppState } from '../redux-setup';
import type { SessionIdentification } from 'lib/types/session-types';

import { createSelector } from 'reselect';

import { createOpenSocketFunction } from 'lib/shared/socket-utils';

const openSocketSelector = createSelector(
  (state: AppState) => state.baseHref,
  createOpenSocketFunction,
);

const sessionIdentificationSelector = createSelector(
  (state: AppState) => state.sessionID,
  (sessionID: ?string): SessionIdentification => ({ sessionID }),
);

export {
  openSocketSelector,
  sessionIdentificationSelector,
};
