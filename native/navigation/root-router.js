// @flow

import type {
  NavigationState,
  StackAction,
  PossiblyStaleRoute,
  Router,
  StackRouterOptions,
  StackNavigationState,
  RouterConfigOptions,
  PossiblyStaleNavigationState,
} from '@react-navigation/native';
import { StackRouter, CommonActions } from '@react-navigation/native';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';

import {
  logInActionType,
  logOutActionType,
  clearRootModalsActionType,
  setNavStateActionType,
} from './action-types.js';
import { defaultNavigationState } from './default-state.js';
import { removeScreensFromStack } from './navigation-utils.js';
import {
  accountModals,
  LoggedOutModalRouteName,
  AppRouteName,
} from './route-names.js';

type LogInAction = {
  +type: 'LOG_IN',
};
type LogOutAction = {
  +type: 'LOG_OUT',
};
type ClearRootModalsAction = {
  +type: 'CLEAR_ROOT_MODALS',
  +payload: {
    +keys: $ReadOnlyArray<string>,
  },
};
type SetNavStateAction = {
  +type: 'SET_NAV_STATE',
  +payload: {
    +state: NavigationState,
    +hideFromMonitor?: boolean,
  },
};
export type RootRouterNavigationAction =
  | StackAction
  | LogInAction
  | LogOutAction
  | ClearRootModalsAction
  | SetNavStateAction;

export type RootRouterExtraNavigationHelpers = {
  +logIn: () => void,
  +logOut: () => void,
  +clearRootModals: (keys: $ReadOnlyArray<string>) => void,
  +setNavState: (state: NavigationState) => void,
  +goBackOnce: () => void,
};

type ResetStateRoute = {
  +name: string,
  +state?: { +routes: $ReadOnlyArray<ResetStateRoute>, ... },
  ...
};
function resetState<Route: ResetStateRoute>(
  newPartialRoute: Route,
  oldRoute: Route,
): Route {
  if (_isEqual(newPartialRoute)(oldRoute)) {
    return oldRoute;
  }

  if (!newPartialRoute.state) {
    invariant(!oldRoute.state, 'resetState found non-matching state');
    return { ...oldRoute, ...newPartialRoute };
  }
  invariant(oldRoute.state, 'resetState found non-matching state');

  const routes = [];
  let newRouteIndex = 0;
  let oldRouteIndex = 0;
  while (newRouteIndex < newPartialRoute.state.routes.length) {
    const newSubroute = newPartialRoute.state.routes[newRouteIndex];
    let oldSubroute = oldRoute.state.routes[oldRouteIndex];
    invariant(oldSubroute, 'resetState found a missing oldRoute');
    while (oldSubroute.name !== newSubroute.name) {
      oldRouteIndex++;
      oldSubroute = oldRoute.state.routes[oldRouteIndex];
    }
    routes.push(resetState(newSubroute, oldSubroute));
    newRouteIndex++;
    oldRouteIndex++;
  }

  let newState = {
    ...oldRoute.state,
    ...newPartialRoute.state,
    routes,
  };
  if (_isEqual(newState)(oldRoute.state)) {
    newState = oldRoute.state;
  }

  return {
    ...oldRoute,
    ...newPartialRoute,
    state: newState,
  };
}

function resetFirstRoute(
  state: StackNavigationState,
): PossiblyStaleNavigationState {
  const [firstRoute, ...restRoutes] = state.routes;
  const newFirstRoute = resetState(
    defaultNavigationState.routes[0],
    firstRoute,
  );
  return ({
    ...state,
    routes: [newFirstRoute, ...restRoutes],
  }: any);
}

function RootRouter(
  routerOptions: StackRouterOptions,
): Router<StackNavigationState, RootRouterNavigationAction> {
  const {
    getStateForAction: baseGetStateForAction,
    actionCreators: baseActionCreators,
    getStateForRouteFocus: baseGetStateForRouteFocus,
    ...rest
  } = StackRouter(routerOptions);
  return {
    ...rest,
    getStateForAction: (
      lastState: StackNavigationState,
      action: RootRouterNavigationAction,
      options: RouterConfigOptions,
    ) => {
      if (action.type === logInActionType) {
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: PossiblyStaleRoute<>) =>
            accountModals.includes(route.name) ? 'remove' : 'keep',
        );
      } else if (action.type === logOutActionType) {
        if (!lastState) {
          return lastState;
        }
        let newState = resetFirstRoute(lastState);

        let loggedOutModalFound = false;
        newState = removeScreensFromStack(
          newState,
          (route: PossiblyStaleRoute<>) => {
            const { name } = route;
            if (name === LoggedOutModalRouteName) {
              loggedOutModalFound = true;
            }
            return name === AppRouteName || accountModals.includes(name)
              ? 'keep'
              : 'remove';
          },
        );

        if (!loggedOutModalFound) {
          const [appRoute, ...restNewRoutes] = newState.routes;
          newState = ({
            ...newState,
            index: newState.index + 1,
            routes: [
              appRoute,
              { name: LoggedOutModalRouteName },
              ...restNewRoutes,
            ],
          }: any);
        }

        return baseGetStateForAction(
          lastState,
          CommonActions.reset(newState),
          options,
        );
      } else if (action.type === clearRootModalsActionType) {
        const { keys } = action.payload;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: PossiblyStaleRoute<>) =>
            keys.includes(route.key) ? 'remove' : 'keep',
        );
      } else if (action.type === setNavStateActionType) {
        return action.payload.state;
      } else {
        if (!lastState) {
          return lastState;
        }
        const newState = baseGetStateForAction(lastState, action, options);
        if (!newState) {
          return newState;
        }
        const lastRouteName = lastState.routes[lastState.index].name;
        const newRouteName = newState.routes[newState.index].name;
        if (
          accountModals.includes(lastRouteName) &&
          !accountModals.includes(newRouteName)
        ) {
          // Only our custom action types are allowed to clear account modals
          return lastState;
        }
        return newState;
      }
    },
    getStateForRouteFocus: (state: StackNavigationState, key: string) => {
      const newState = baseGetStateForRouteFocus(state, key);
      const lastRouteName = state.routes[state.index].name;
      const newRouteName = newState.routes[newState.index].name;
      if (
        accountModals.includes(lastRouteName) &&
        !accountModals.includes(newRouteName)
      ) {
        // Only our custom action types are allowed to clear account modals
        return state;
      }
      return newState;
    },
    actionCreators: {
      ...baseActionCreators,
      logIn: () => ({ type: logInActionType }: LogInAction),
      logOut: () => ({ type: logOutActionType }: LogOutAction),
      clearRootModals: (keys: $ReadOnlyArray<string>) => ({
        type: clearRootModalsActionType,
        payload: { keys },
      }),
      setNavState: (
        state: NavigationState,
        hideFromMonitor?: boolean = false,
      ) => ({
        type: setNavStateActionType,
        payload: { state, hideFromMonitor },
      }),
      goBackOnce: () => state => ({
        ...CommonActions.goBack(),
        target: state.key,
      }),
    },
  };
}

export default RootRouter;
