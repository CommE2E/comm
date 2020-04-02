// @flow

import type { NavigationState } from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import type { NavInfo } from './default-state';

import { useScreens } from 'react-native-screens';

import { infoFromURL } from 'lib/utils/url-utils';

import { VerificationModalRouteName } from './route-names';
import { handleURLActionType } from '../redux/action-types';
import RootNavigator from './root-navigator.react';

// eslint-disable-next-line react-hooks/rules-of-hooks
useScreens();

function reduceNavInfo(state: AppState, action: *): NavInfo {
  // React Navigation actions
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

  // Deep linking
  if (action.type === handleURLActionType) {
    return {
      startDate: state.navInfo.startDate,
      endDate: state.navInfo.endDate,
      navigationState: handleURL(state.navInfo.navigationState, action.payload),
    };
  }

  return state.navInfo;
}

function handleURL(state: NavigationState, url: string): NavigationState {
  const urlInfo = infoFromURL(url);
  if (!urlInfo.verify) {
    // TODO correctly handle non-verify URLs
    return state;
  }

  // Special-case behavior if there's already a VerificationModal
  const currentRoute = state.routes[state.index];
  if (currentRoute.key === 'VerificationModal') {
    const newRoute = {
      ...currentRoute,
      params: {
        verifyCode: urlInfo.verify,
      },
    };
    const newRoutes = [...state.routes];
    newRoutes[state.index] = newRoute;
    return {
      index: state.index,
      routes: newRoutes,
    };
  }

  return {
    index: state.index + 1,
    routes: [
      ...state.routes,
      {
        key: 'VerificationModal',
        routeName: VerificationModalRouteName,
        params: {
          verifyCode: urlInfo.verify,
        },
      },
    ],
    isTransitioning: true,
  };
}

export default reduceNavInfo;
