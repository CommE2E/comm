// @flow

import type { NavContextType } from '../navigation/navigation-context';
import type { AppState } from '../redux/redux-setup';

export type NavPlusRedux = {|
  redux: AppState,
  navContext: ?NavContextType,
|};
