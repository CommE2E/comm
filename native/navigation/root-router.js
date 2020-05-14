// @flow

import { StackRouter, CommonActions } from '@react-navigation/native';

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

function resetState(newPartialRoute, oldRoute) {
  if (oldRoute.state && oldRoute.state.stale) {
    // If React Navigation hasn't rehydrated the state for this navigator yet,
    // we can assume that it matches the default state. By keeping the old state
    // we prevent React Navigation from assigning a new key
    return oldRoute;
  }
  const newRoute = { ...oldRoute, ...newPartialRoute };
  if (!newRoute.state) {
    return newRoute;
  }
  const routes = [];
  for (let i = 0; i < newRoute.state.routes.length; i++) {
    routes.push(resetState(
      newPartialRoute.state.routes[i],
      oldRoute.state.routes[i],
    ));
  }
  return {
    ...newRoute,
    state: {
      ...oldRoute.state,
      ...newRoute.state,
      routes,
    },
  };
}

function RootRouter(options) {
  const stackRouter = StackRouter(options);
  return {
    ...stackRouter,
    getStateForAction: (
      lastState,
      action,
      options,
    ) => {
      if (action.type === logInActionType) {
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            accountModals.includes(route.name) ? 'remove' : 'keep',
        );
      } else if (action.type === logOutActionType) {
        if (!lastState) {
          return lastState;
        }
        let newState = { ...lastState };
        newState.routes[0] = resetState(
          defaultNavigationState.routes[0],
          newState.routes[0],
        );

        let loggedOutModalFound = false;
        newState = removeScreensFromStack(
          newState,
          (route: NavigationRoute) => {
            const { name } = route;
            if (name === LoggedOutModalRouteName) {
              loggedOutModalFound = true;
            }
            return name === AppRouteName ||
              accountModals.includes(name)
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
              { name: LoggedOutModalRouteName },
              ...restRoutes,
            ],
          };
        }

        return stackRouter.getStateForAction(
          lastState,
          CommonActions.reset(newState),
          options,
        );
      } else if (action.type === clearRootModalsActionType) {
        const { keys } = action;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            keys.includes(route.key) ? 'remove' : 'keep',
        );
      } else if (action.type === setNavStateActionType) {
        return action.state;
      } else {
        if (!lastState) {
          return lastState;
        }
        const newState = stackRouter.getStateForAction(lastState, action, options);
        if (!newState) {
          return newState;
        }
        const lastRouteName = lastState.routes[lastState.index].name;
        const newRouteName = newState.routes[newState.index].name;
        if (
          accountModals.includes(lastRouteName) &&
          !accountModals.includes(newRouteName)
        ) {
          return lastState;
        }
        return newState;
      }
    },
    actionCreators: {
      ...stackRouter.actionCreators,
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
    },
  };
}

export default RootRouter;
