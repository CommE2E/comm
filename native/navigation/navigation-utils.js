// @flow

import type {
  PossiblyStaleNavigationState,
  PossiblyStaleRoute,
  StaleLeafRoute,
  ScreenParams,
} from '@react-navigation/native';
import invariant from 'invariant';

import {
  ComposeSubchannelRouteName,
  AppRouteName,
  threadRoutes,
} from './route-names';

function getStateFromNavigatorRoute(
  route: PossiblyStaleRoute<>,
): PossiblyStaleNavigationState {
  const key = route.key ? route.key : `unkeyed ${route.name}`;
  invariant(route.state, `expecting Route for ${key} to be NavigationState`);
  return route.state;
}

function getThreadIDFromParams(params: ?ScreenParams): string {
  invariant(
    params &&
      params.threadInfo &&
      typeof params.threadInfo === 'object' &&
      params.threadInfo.id &&
      typeof params.threadInfo.id === 'string',
    "there's no way in react-navigation/Flow to type this",
  );
  return params.threadInfo.id;
}

function getParentThreadIDFromParams(params: ?ScreenParams): ?string {
  if (!params) {
    return undefined;
  }
  const { parentThreadInfo } = params;
  if (!parentThreadInfo) {
    return undefined;
  }
  invariant(
    typeof parentThreadInfo === 'object' &&
      parentThreadInfo.id &&
      typeof parentThreadInfo.id === 'string',
    "there's no way in react-navigation/Flow to type this",
  );
  return parentThreadInfo.id;
}

function getThreadIDFromRoute(
  route: PossiblyStaleRoute<>,
  routes?: $ReadOnlyArray<string> = threadRoutes,
): ?string {
  if (!routes.includes(route.name)) {
    return null;
  }
  if (route.name === ComposeSubchannelRouteName) {
    return getParentThreadIDFromParams(route.params);
  }
  return getThreadIDFromParams(route.params);
}

function currentRouteRecurse(route: PossiblyStaleRoute<>): StaleLeafRoute<> {
  if (!route.state) {
    return route;
  }
  const state = getStateFromNavigatorRoute(route);
  return currentRouteRecurse(state.routes[state.index]);
}

function currentLeafRoute(
  state: PossiblyStaleNavigationState,
): StaleLeafRoute<> {
  return currentRouteRecurse(state.routes[state.index]);
}

function findRouteIndexWithKey(
  state: PossiblyStaleNavigationState,
  key: string,
): ?number {
  for (let i = 0; i < state.routes.length; i++) {
    const route = state.routes[i];
    if (route.key === key) {
      return i;
    }
  }
  return null;
}

// This function walks from the back of the stack and calls filterFunc on each
// screen until the stack is exhausted or filterFunc returns "break". A screen
// will be removed if and only if filterFunc returns "remove" (not "break").
function removeScreensFromStack<
  Route,
  State: { +routes: $ReadOnlyArray<Route>, +index: number, ... },
>(
  state: State,
  filterFunc: (route: Route) => 'keep' | 'remove' | 'break',
): State {
  const newRoutes = [];
  let newIndex = state.index;
  let screenRemoved = false;
  let breakActivated = false;
  for (let i = state.routes.length - 1; i >= 0; i--) {
    const route = state.routes[i];
    if (breakActivated) {
      newRoutes.unshift(route);
      continue;
    }
    const result = filterFunc(route);
    if (result === 'break') {
      breakActivated = true;
    }
    if (breakActivated || result === 'keep') {
      newRoutes.unshift(route);
      continue;
    }
    screenRemoved = true;
    if (newIndex >= i) {
      invariant(
        newIndex !== 0,
        'Attempting to remove current route and all before it',
      );
      newIndex--;
    }
  }
  if (!screenRemoved) {
    return state;
  }
  return {
    ...state,
    index: newIndex,
    routes: newRoutes,
  };
}

function validNavState(state: PossiblyStaleNavigationState): boolean {
  if (state.routes.length === 0) {
    return false;
  }
  const [firstRoute] = state.routes;
  if (firstRoute.name !== AppRouteName) {
    return false;
  }
  return true;
}

function getChildRouteFromNavigatorRoute(
  parentRoute: PossiblyStaleRoute<>,
  childRouteName: string,
): ?PossiblyStaleRoute<> {
  if (!parentRoute.state) {
    return null;
  }
  const parentState = parentRoute.state;
  const childRoute = parentState.routes.find(
    route => route.name === childRouteName,
  );
  invariant(
    childRoute,
    `parentRoute should contain route for ${childRouteName}`,
  );
  return childRoute;
}

export {
  getStateFromNavigatorRoute,
  getThreadIDFromParams,
  getThreadIDFromRoute,
  currentLeafRoute,
  findRouteIndexWithKey,
  removeScreensFromStack,
  validNavState,
  getChildRouteFromNavigatorRoute,
};
