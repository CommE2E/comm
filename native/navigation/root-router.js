// @flow

import type {
  StackNavigationProp,
  ParamListBase,
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

import { removeScreensFromStack } from './navigation-utils';
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
  +payload: {|
    +keys: $ReadOnlyArray<string>,
  |},
|};
type SetNavStateAction = {|
  +type: 'SET_NAV_STATE',
  +payload: {|
    +state: NavigationState,
    +hideFromMonitor?: boolean,
  |},
|};
export type RootRouterNavigationAction =
  | StackAction
  | LogInAction
  | LogOutAction
  | ClearRootModalsAction
  | SetNavStateAction;

export type RootRouterNavigationProp<
  ParamList: ParamListBase = ParamListBase,
  RouteName: string = string,
> = {|
  ...StackNavigationProp<ParamList, RouteName>,
  +logIn: () => void,
  +logOut: () => void,
  +clearRootModals: (keys: $ReadOnlyArray<string>) => void,
  +setNavState: (state: NavigationState) => void,
  +goBackOnce: () => void,
|};

type ResetStateRoute = {
  +state?: { +routes: $ReadOnlyArray<ResetStateRoute> },
};
function resetState<Route: ResetStateRoute>(
  newPartialRoute: Route,
  oldRoute: Route,
): Route {
  if (!newPartialRoute.state) {
    invariant(!oldRoute.state, 'resetState found non-matching state');
    return { ...oldRoute, ...newPartialRoute };
  }
  invariant(oldRoute.state, 'resetState found non-matching state');
  const routes = [];
  for (let i = 0; i < newPartialRoute.state.routes.length; i++) {
    routes.push(
      resetState(newPartialRoute.state.routes[i], oldRoute.state.routes[i]),
    );
  }
  return {
    ...oldRoute,
    ...newPartialRoute,
    state: {
      ...oldRoute.state,
      ...newPartialRoute.state,
      routes,
    },
  };
}

function RootRouter(
  routerOptions: StackRouterOptions,
): Router<StackNavigationState, RootRouterNavigationAction> {
  const {
    getStateForAction: baseGetStateForAction,
    actionCreators: baseActionCreators,
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
        const [firstRoute, ...restRoutes] = lastState.routes;
        const newFirstRoute = resetState(
          defaultNavigationState.routes[0],
          firstRoute,
        );
        let newState: PossiblyStaleNavigationState = ({
          ...lastState,
          routes: [newFirstRoute, ...restRoutes],
        }: any);

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
          return lastState;
        }
        return newState;
      }
    },
    actionCreators: {
      ...baseActionCreators,
      logIn: () => ({ type: logInActionType }),
      logOut: () => ({ type: logOutActionType }),
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
