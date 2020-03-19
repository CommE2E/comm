// @flow

import type {
  NavigationLeafRoute,
  NavigationStateRoute,
  NavigationRoute,
  NavigationParams,
  NavigationState,
} from 'react-navigation';

import invariant from 'invariant';

function assertNavigationRouteNotLeafNode(
  route: NavigationRoute,
): NavigationStateRoute {
  // There's no way in Flow to type the exact shape of our navigationState,
  // since arrays types can't be refined to tuples. We thus must rely on runtime
  // assertions to satisfy Flow's typesystem.
  invariant(
    route.routes &&
      Array.isArray(route.routes) &&
      route.index !== null &&
      route.index !== undefined &&
      typeof route.index === 'number',
    'route should be a NavigationStateRoute',
  );
  const index = route.index;
  const routes = [];
  for (let subroute of route.routes) {
    invariant(
      subroute &&
        typeof subroute === 'object' &&
        typeof subroute.key === 'string' &&
        typeof subroute.routeName === 'string',
      'subroute should be a NavigationRoute!',
    );
    let subrouteCopy: NavigationRoute = {
      key: subroute.key,
      routeName: subroute.routeName,
    };
    if (subroute.path) {
      invariant(
        typeof subroute.path === 'string',
        "navigation's path should be a string!",
      );
      subrouteCopy.path = subroute.path;
    }
    if (subroute.params) {
      invariant(
        subroute.params && typeof subroute.params === 'object',
        "navigation's params should be an object!",
      );
      subrouteCopy.params = subroute.params;
    }
    if (subroute.index !== null && subroute.index !== undefined) {
      subrouteCopy = assertNavigationRouteNotLeafNode({
        ...subroute,
        ...subrouteCopy,
      });
    }
    routes.push(subrouteCopy);
  }
  return {
    ...route,
    index,
    routes,
  };
}

function getThreadIDFromParams(object: { params?: NavigationParams }): string {
  invariant(
    object.params &&
      object.params.threadInfo &&
      typeof object.params.threadInfo === 'object' &&
      object.params.threadInfo.id &&
      typeof object.params.threadInfo.id === 'string',
    "there's no way in react-navigation/Flow to type this",
  );
  return object.params.threadInfo.id;
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

export {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
  currentLeafRoute,
  findRouteIndexWithKey,
};
