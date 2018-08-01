// @flow

import { createSelector } from 'reselect';

import { pingActionInput } from 'lib/selectors/ping-selectors';
import { pingActionInputSelector } from 'lib/shared/ping-utils';

import { activeThreadSelector } from './nav-selectors';

const pingWebActionInput = createSelector(
  activeThreadSelector,
  pingActionInput,
  pingActionInputSelector,
);

export {
  pingWebActionInput,
};
