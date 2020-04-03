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
import { defaultNavigationState } from './default-state';

type LogInAction = {|
  +type: 'LOG_IN',
|};
type LogOutAction = {|
  +type: 'LOG_OUT',
|};
type ClearRootModalsAction = {|
  +type: 'CLEAR_ROOT_MODALS',
  +keys: $ReadOnlyArray<string>,
  +preserveFocus?: boolean,
|};
type SetNavStateAction = {|
  +type: 'SET_NAV_STATE',
  +state: NavigationState,
|};
export type RootRouterNavigationAction =
  | NavigationAction
  | LogInAction
  | LogOutAction
  | ClearRootModalsAction
  | SetNavStateAction;

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
        const isTransitioning =
          lastState.routes[lastState.index].key !==
          newState.routes[newState.index].key;
        return {
          ...newState,
          isTransitioning,
        };
      } else if (action.type === 'LOG_OUT') {
        if (!lastState) {
          return lastState;
        }
        let newState = { ...lastState };
        newState.routes[0] = defaultNavigationState.routes[0];

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
        }

        const isTransitioning =
          lastState.routes[lastState.index].key !==
          newState.routes[newState.index].key;
        return {
          ...newState,
          isTransitioning,
        };
      } else if (action.type === 'CLEAR_ROOT_MODALS') {
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
      } else if (action.type === 'SET_NAV_STATE') {
        return action.state;
      } else {
        return stackRouter.getStateForAction(action, lastState);
      }
    },
    getActionCreators: (route: NavigationRoute, navStateKey: ?string) => ({
      ...stackRouter.getActionCreators(route, navStateKey),
      logIn: () => ({ type: 'LOG_IN' }),
      logOut: () => ({ type: 'LOG_OUT' }),
      clearRootModals: (
        keys: $ReadOnlyArray<string>,
        preserveFocus: boolean,
      ) => ({
        type: 'CLEAR_ROOT_MODALS',
        keys,
        preserveFocus,
      }),
      setNavState: (state: NavigationState) => ({
        type: 'SET_NAV_STATE',
        state,
      }),
    }),
  };
}

export default RootRouter;
