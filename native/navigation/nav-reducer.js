// @flow

import type { AppState } from '../redux/redux-setup';
import type { NavInfo } from './default-state';

import { useScreens } from 'react-native-screens';

import RootNavigator from './root-navigator.react';

// eslint-disable-next-line react-hooks/rules-of-hooks
useScreens();

function reduceNavInfo(state: AppState, action: *): NavInfo {
  const navigationState = RootNavigator.router.getStateForAction(
    action,
    state.navInfo.navigationState,
  );
  if (navigationState && navigationState !== state.navInfo.navigationState) {
    return {
      startDate: state.navInfo.startDate,
      endDate: state.navInfo.endDate,
      navigationState,
    };
  }
  return state.navInfo;
}

export default reduceNavInfo;
