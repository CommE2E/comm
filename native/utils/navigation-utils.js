// @flow

import type {
  NavigationLeafRoute,
  NavigationStateRoute,
  NavigationRoute,
  NavigationParams,
  NavigationState,
} from 'react-navigation';

import invariant from 'invariant';

import {
  ComposeThreadRouteName,
  threadRoutes,
} from '../navigation/route-names';

function assertNavigationRouteNotLeafNode(
  route: NavigationRoute,
): NavigationStateRoute {
  return route;
}

function getThreadIDFromParams(params: ?NavigationParams): string {
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

function getParentThreadIDFromParams(params: ?NavigationParams): ?string {
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
  route: NavigationRoute,
  routes?: $ReadOnlyArray<string> = threadRoutes,
) {
  if (!routes.includes(route.name)) {
    return null;
  }
  if (route.name === ComposeThreadRouteName) {
    return getParentThreadIDFromParams(route.params);
  }
  return getThreadIDFromParams(route.params);
}

function currentRouteRecurse(state: NavigationRoute): NavigationLeafRoute {
  if (state.index || state.routes) {
    const stateRoute = assertNavigationRouteNotLeafNode(state);
    return currentRouteRecurse(stateRoute.routes[stateRoute.index]);
  } else {
    return state;
  }
}

function currentLeafRoute(state: NavigationState): NavigationLeafRoute {
  return currentRouteRecurse(state.routes[state.index]);
}

function findRouteIndexWithKey(state: NavigationState, key: string): ?number {
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
function removeScreensFromStack<S: NavigationState>(
  state: S,
  filterFunc: (route: NavigationRoute) => 'keep' | 'remove' | 'break',
): S {
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

export {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
  getThreadIDFromRoute,
  currentLeafRoute,
  findRouteIndexWithKey,
  removeScreensFromStack,
};
