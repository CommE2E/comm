// @flow

import type { ThreadInfo } from 'lib/types/thread-types';

import {
  StackRouter,
  NavigationActions,
  type NavigationAction,
  type NavigationState,
  type NavigationRoute,
  type NavigationRouteConfigMap,
  type NavigationStackRouterConfig,
} from 'react-navigation';

import { removeScreensFromStack } from '../navigation/navigation-setup';
import {
  ChatThreadListRouteName,
  MessageListRouteName,
} from '../navigation/route-names';

type ClearScreensAction = {|
  +type: 'CLEAR_SCREENS',
  +routeNames: $ReadOnlyArray<string>,
|};
type ReplaceWithThreadAction = {|
  +type: 'REPLACE_WITH_THREAD',
  +threadInfo: ThreadInfo,
|};
type CustomNavigationAction = ClearScreensAction | ReplaceWithThreadAction;

const defaultConfig = Object.freeze({});
function ChatRouter(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: NavigationStackRouterConfig = defaultConfig,
) {
  const stackRouter = StackRouter(routeConfigMap, stackConfig);
  return {
    ...stackRouter,
    getStateForAction: (
      action: NavigationAction | CustomNavigationAction,
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
      } else if (action.type === 'REPLACE_WITH_THREAD') {
        const { threadInfo } = action;
        if (!lastState) {
          return lastState;
        }
        const clearedState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            route.routeName === ChatThreadListRouteName ? 'keep' : 'remove',
        );
        const navigateAction = NavigationActions.navigate({
          routeName: MessageListRouteName,
          key: `${MessageListRouteName}${threadInfo.id}`,
          params: { threadInfo },
        });
        return stackRouter.getStateForAction(navigateAction, clearedState);
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
      replaceWithThread: (threadInfo: ThreadInfo) => ({
        type: 'REPLACE_WITH_THREAD',
        threadInfo,
      }),
    }),
  };
}

export default ChatRouter;
