// @flow

import type { NavContextType } from '../navigation/navigation-context.js';
import type { AppState } from '../redux/state-types.js';

export type NavPlusRedux = {
  +redux: AppState,
  +navContext: ?NavContextType,
};
