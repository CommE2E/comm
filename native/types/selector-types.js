// @flow

import type { AppState } from '../redux/redux-setup';
import type { NavigationState } from 'react-navigation';

export type NavPlusRedux = {|
  redux: AppState,
  nav: NavigationState,
|};
