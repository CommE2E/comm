// @flow

import type { AppState } from '../redux/redux-setup';
import type { NavContextType } from '../navigation/navigation-context';

export type NavPlusRedux = {|
  redux: AppState,
  navContext: ?NavContextType,
|};
