// @flow

import type { NavContextType } from '../navigation/navigation-context';
import type { AppState } from '../redux/state-types';

export type NavPlusRedux = {|
  +redux: AppState,
  +navContext: ?NavContextType,
|};
