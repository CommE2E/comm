// @flow

import {
  StackRouter,
  type NavigationAction,
  type NavigationState,
  type NavigationRoute,
  type NavigationRouteConfigMap,
  type NavigationStackRouterConfig,
} from 'react-navigation';

import { removeScreensFromStack } from '../utils/navigation-utils';
import { clearOverlayModalsActionType } from './action-types';

type ClearOverlayModalsAction = {|
  +type: 'CLEAR_OVERLAY_MODALS',
  +keys: $ReadOnlyArray<string>,
  +preserveFocus?: boolean,
|};
export type OverlayRouterNavigationAction =
  | NavigationAction
  | ClearOverlayModalsAction;

const defaultConfig = Object.freeze({});
function OverlayRouter(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: NavigationStackRouterConfig = defaultConfig,
) {
  const stackRouter = StackRouter(routeConfigMap, stackConfig);
  return {
    ...stackRouter,
    getStateForAction: (
      action: OverlayRouterNavigationAction,
      lastState: ?NavigationState,
    ) => {
      if (action.type === clearOverlayModalsActionType) {
        const { keys } = action;
        if (!lastState) {
          return lastState;
        }
        const newState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            keys.includes(route.key) ? 'remove' : 'keep',
        );
        if (newState === lastState) {
          return lastState;
        }
        const isTransitioning =
          lastState.routes[lastState.index].key !==
          newState.routes[newState.index].key;
        return {
          ...newState,
          isTransitioning,
        };
      } else {
        return stackRouter.getStateForAction(action, lastState);
      }
    },
    getActionCreators: (route: NavigationRoute, navStateKey: ?string) => ({
      ...stackRouter.getActionCreators(route, navStateKey),
      clearOverlayModals: (
        keys: $ReadOnlyArray<string>,
        preserveFocus: boolean,
      ) => ({
        type: clearOverlayModalsActionType,
        keys,
        preserveFocus,
      }),
    }),
  };
}

export default OverlayRouter;
