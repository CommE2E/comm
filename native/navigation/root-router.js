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
import { accountModals } from './route-names';

type LogInAction = {|
  +type: 'LOG_IN',
|};
type LogOutAction = {|
  +type: 'LOG_OUT',
|};
export type RootRouterNavigationAction =
  | NavigationAction
  | LogInAction
  | LogOutAction;

const defaultConfig = Object.freeze({});
function RootRouter(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: NavigationStackRouterConfig = defaultConfig,
) {
  const stackRouter = StackRouter(routeConfigMap, stackConfig);
  return {
    ...stackRouter,
    getStateForAction: (
      action: RootRouterNavigationAction,
      lastState: ?NavigationState,
    ) => {
      if (action.type === 'LOG_IN') {
        if (!lastState) {
          return lastState;
        }
        const newState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            accountModals.includes(route.routeName) ? 'remove' : 'keep',
        );
        if (newState === lastState) {
          return lastState;
        }
        return {
          ...newState,
          isTransitioning: true,
        };
      } else if (action.type === 'LOG_OUT') {
        return lastState;
      } else {
        return stackRouter.getStateForAction(action, lastState);
      }
    },
  };
}

export default RootRouter;
