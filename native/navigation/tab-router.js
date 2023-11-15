// @flow

import type {
  Router,
  RouterConfigOptions,
  TabRouterOptions,
  TabNavigationState,
  TabAction,
} from '@react-navigation/core';
import { TabRouter } from '@react-navigation/native';

import {
  getChatNavStateFromTabNavState,
  getRemoveEditMode,
} from './nav-selectors.js';

export type TabRouterExtraNavigationHelpers = {};

function CustomTabRouter(
  routerOptions: TabRouterOptions,
): Router<TabNavigationState, TabAction> {
  const { getStateForAction: baseGetStateForAction, ...rest } =
    TabRouter(routerOptions);
  return {
    ...rest,
    getStateForAction: (
      lastState: TabNavigationState,
      action: TabAction,
      options: RouterConfigOptions,
    ) => {
      const chatNavState = getChatNavStateFromTabNavState(lastState);
      const removeEditMode = getRemoveEditMode(chatNavState);
      if (removeEditMode && removeEditMode(action) === 'ignore_action') {
        return lastState;
      }
      return baseGetStateForAction(lastState, action, options);
    },
  };
}

export default CustomTabRouter;
