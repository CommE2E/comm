// @flow

import type {
  NavigationLeafRoute,
  NavigationStateRoute,
  NavigationRoute,
} from 'react-navigation/src/TypeDefinition';

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
      route.index !== null && route.index !== undefined &&
      typeof route.index === "number",
    "route should be a NavigationStateRoute",
  );
  const index = route.index;
  const routes = [];
  for (let subroute of route.routes) {
    invariant(
      subroute &&
        typeof subroute === "object" &&
        typeof subroute.key === "string" &&
        typeof subroute.routeName === "string",
      "subroute should be a NavigationRoute!",
    );
    let subrouteCopy: NavigationRoute = {
      key: subroute.key,
      routeName: subroute.routeName,
    };
    if (subroute.path) {
      invariant(
        typeof subroute.path === "string",
        "navigation's path should be a string!",
      );
      subrouteCopy.path = subroute.path;
    }
    if (subroute.params) {
      invariant(
        subroute.params &&
          typeof subroute.params === "object",
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

export {
  assertNavigationRouteNotLeafNode,
};
