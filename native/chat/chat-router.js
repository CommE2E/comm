// @flow

import {
  StackRouter,
  type NavigationAction,
  type NavigationState,
  type NavigationRoute,
  type NavigationRouteConfigMap,
  type NavigationStackRouterConfig,
} from 'react-navigation';

import { removeScreensFromStack } from '../navigation/navigation-setup';

type ClearScreensAction = {|
  +type: 'CLEAR_SCREENS',
  +routeNames: $ReadOnlyArray<string>,
|};

const defaultConfig = Object.freeze({});
function ChatRouter(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: NavigationStackRouterConfig = defaultConfig,
) {
  const stackRouter = StackRouter(routeConfigMap, stackConfig);
  return {
    ...stackRouter,
    getStateForAction: (
      action: NavigationAction | ClearScreensAction,
      lastState: ?NavigationState,
    ) => {
      if (action.type === 'CLEAR_SCREENS') {
        const { routeNames } = action;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(lastState, (route: NavigationRoute) =>
          routeNames.includes(route.routeName) ? 'remove' : 'keep',
        );
      } else {
        return stackRouter.getStateForAction(action, lastState);
      }
    },
    getActionCreators: (route: NavigationRoute, navStateKey: ?string) => ({
      ...stackRouter.getActionCreators(route, navStateKey),
      clearScreens: (routeNames: $ReadOnlyArray<string>) => ({
        type: 'CLEAR_SCREENS',
        routeNames,
      }),
    }),
  };
}

export default ChatRouter;
