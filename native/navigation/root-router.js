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
import {
  accountModals,
  LoggedOutModalRouteName,
  AppRouteName,
} from './route-names';
import { defaultNavInfo } from './default-state';

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
        if (!lastState) {
          return lastState;
        }
        let newState = { ...lastState };
        newState.routes[0] = defaultNavInfo.navigationState.routes[0];

        const initialKey = newState.routes[newState.index].key;
        let loggedOutModalFound = false;
        newState = removeScreensFromStack(
          newState,
          (route: NavigationRoute) => {
            const { routeName } = route;
            if (routeName === LoggedOutModalRouteName) {
              loggedOutModalFound = true;
            }
            return routeName === AppRouteName ||
              accountModals.includes(routeName)
              ? 'keep'
              : 'remove';
          },
        );

        let isTransitioning =
          newState.routes[newState.index].key === initialKey;
        if (!loggedOutModalFound) {
          const [appRoute, ...restRoutes] = newState.routes;
          newState = {
            ...newState,
            index: newState.index + 1,
            routes: [
              appRoute,
              { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
              ...restRoutes,
            ],
          };
          if (newState.index === 1) {
            isTransitioning = true;
          }
        }

        if (isTransitioning) {
          newState = {
            ...newState,
            isTransitioning,
          };
        }

        return newState;
      } else {
        return stackRouter.getStateForAction(action, lastState);
      }
    },
  };
}

export default RootRouter;
