// @flow

import type {
  StackAction,
  Route,
  Router,
  StackRouterOptions,
  StackNavigationState,
  RouterConfigOptions,
  ScreenParams,
} from '@react-navigation/native';
import { StackRouter, CommonActions } from '@react-navigation/native';

import {
  clearOverlayModalsActionType,
  setRouteParamsActionType,
} from './action-types.js';
import { getRemoveEditMode, getChatNavState } from './nav-selectors.js';
import { removeScreensFromStack } from './navigation-utils.js';

type ClearOverlayModalsAction = {
  +type: 'CLEAR_OVERLAY_MODALS',
  +payload: {
    +keys: $ReadOnlyArray<string>,
  },
};
type SetRouteParamsAction = {
  +type: 'SET_ROUTE_PARAMS',
  +payload: {
    +routeKey: string,
    +params: ScreenParams,
  },
};
export type OverlayRouterNavigationAction =
  | StackAction
  | ClearOverlayModalsAction
  | SetRouteParamsAction;

export type OverlayRouterExtraNavigationHelpers = {
  +clearOverlayModals: (keys: $ReadOnlyArray<string>) => void,
  +goBackOnce: () => void,
  +setRouteParams: (routeKey: string, params: ScreenParams) => void,
};

function OverlayRouter(
  routerOptions: StackRouterOptions,
): Router<StackNavigationState, OverlayRouterNavigationAction> {
  const {
    getStateForAction: baseGetStateForAction,
    actionCreators: baseActionCreators,
    ...rest
  } = StackRouter(routerOptions);
  return {
    ...rest,
    getStateForAction: (
      lastState: StackNavigationState,
      action: OverlayRouterNavigationAction,
      options: RouterConfigOptions,
    ) => {
      const chatNavState = getChatNavState(lastState);
      const removeEditMode = getRemoveEditMode(chatNavState);
      if (action.type === clearOverlayModalsActionType) {
        const { keys } = action.payload;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(lastState, (route: Route<>) =>
          keys.includes(route.key) ? 'remove' : 'keep',
        );
      } else if (action.type === setRouteParamsActionType) {
        const newRoutes = lastState.routes.map(route => {
          if (route.key !== action.payload.routeKey || route.state) {
            return route;
          }
          return {
            ...route,
            params: {
              ...route.params,
              ...action.payload.params,
            },
          };
        });
        return {
          ...lastState,
          routes: newRoutes,
        };
      } else if (removeEditMode && removeEditMode(action) === 'ignore_action') {
        return lastState;
      } else {
        return baseGetStateForAction(lastState, action, options);
      }
    },
    actionCreators: {
      ...baseActionCreators,
      clearOverlayModals: (keys: $ReadOnlyArray<string>) => ({
        type: clearOverlayModalsActionType,
        payload: { keys },
      }),
      goBackOnce: () => state => ({
        ...CommonActions.goBack(),
        target: state.key,
      }),
      setRouteParams: (routeKey: string, params: ScreenParams) => ({
        type: setRouteParamsActionType,
        payload: { routeKey, params },
      }),
    },
  };
}

export default OverlayRouter;
