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
import {
  logInActionType,
  logOutActionType,
  clearRootModalsActionType,
  setNavStateActionType,
} from './action-types';

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
  +hideFromMonitor?: boolean,
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
      if (action.type === logInActionType) {
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
      } else if (action.type === logOutActionType) {
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
      } else if (action.type === clearRootModalsActionType) {
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
      } else if (action.type === setNavStateActionType) {
        return action.state;
      } else {
        if (!lastState) {
          return lastState;
        }
        const lastRouteName = lastState.routes[lastState.index].routeName;
        const newState = stackRouter.getStateForAction(action, lastState);
        if (!newState) {
          return newState;
        }
        const newRouteName = newState.routes[newState.index].routeName;
        if (
          accountModals.includes(lastRouteName) &&
          !accountModals.includes(newRouteName)
        ) {
          return lastState;
        }
        return newState;
      }
    },
    getActionCreators: (route: NavigationRoute, navStateKey: ?string) => ({
      ...stackRouter.getActionCreators(route, navStateKey),
      logIn: () => ({ type: logInActionType }),
      logOut: () => ({ type: logOutActionType }),
      clearRootModals: (
        keys: $ReadOnlyArray<string>,
        preserveFocus: boolean,
      ) => ({
        type: clearRootModalsActionType,
        keys,
        preserveFocus,
      }),
      setNavState: (
        state: NavigationState,
        hideFromMonitor?: boolean = false,
      ) => ({
        type: setNavStateActionType,
        state,
        hideFromMonitor,
      }),
    }),
  };
}

export default RootRouter;
