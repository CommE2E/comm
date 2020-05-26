// @flow

import type {
  StackNavigationProp,
  ParamListBase,
  NavigationState,
  StackAction,
  Route,
  PossiblyStaleRoute,
  StackOptions,
} from '@react-navigation/stack';

import { StackRouter, CommonActions } from '@react-navigation/native';
import invariant from 'invariant';

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
  ParamList: ParamListBase,
  RouteName: string,
> = $ReadOnly<{|
  ...StackNavigationProp<ParamList, RouteName>,
  +logIn: () => void,
  +logOut: () => void,
  +clearRootModals: (keys: $ReadOnlyArray<string>) => void,
  +setNavState: (state: NavigationState) => void,
|}>;

function resetState(
  newPartialRoute: PossiblyStaleRoute<>,
  oldRoute: PossiblyStaleRoute<>,
) {
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

function RootRouter(routerOptions: StackOptions) {
  const stackRouter = StackRouter(routerOptions);
  return {
    ...stackRouter,
    getStateForAction: (lastState, action, options) => {
      if (action.type === logInActionType) {
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(lastState, (route: Route<>) =>
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
        newState = removeScreensFromStack(newState, (route: Route<>) => {
          const { name } = route;
          if (name === LoggedOutModalRouteName) {
            loggedOutModalFound = true;
          }
          return name === AppRouteName || accountModals.includes(name)
            ? 'keep'
            : 'remove';
        });

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
        const { keys } = action.payload;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(lastState, (route: Route<>) =>
          keys.includes(route.key) ? 'remove' : 'keep',
        );
      } else if (action.type === setNavStateActionType) {
        return action.payload.state;
      } else {
        if (!lastState) {
          return lastState;
        }
        const newState = stackRouter.getStateForAction(
          lastState,
          action,
          options,
        );
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
    },
  };
}

export default RootRouter;
