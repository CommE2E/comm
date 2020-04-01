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

import {
  ChatThreadListRouteName,
  MessageListRouteName,
} from '../navigation/route-names';
import {
  removeScreensFromStack,
  getThreadIDFromRoute,
} from '../utils/navigation-utils';

type ClearScreensAction = {|
  +type: 'CLEAR_SCREENS',
  +routeNames: $ReadOnlyArray<string>,
|};
type ReplaceWithThreadAction = {|
  +type: 'REPLACE_WITH_THREAD',
  +threadInfo: ThreadInfo,
|};
type ClearThreadsAction = {|
  +type: 'CLEAR_THREADS',
  +threadIDs: $ReadOnlyArray<string>,
|};
export type ChatRouterNavigationAction =
  | NavigationAction
  | ClearScreensAction
  | ReplaceWithThreadAction
  | ClearThreadsAction;

const defaultConfig = Object.freeze({});
function ChatRouter(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: NavigationStackRouterConfig = defaultConfig,
) {
  const stackRouter = StackRouter(routeConfigMap, stackConfig);
  return {
    ...stackRouter,
    getStateForAction: (
      action: ChatRouterNavigationAction,
      lastState: ?NavigationState,
    ) => {
      if (action.type === 'CLEAR_SCREENS') {
        const { routeNames } = action;
        if (!lastState) {
          return lastState;
        }
        const lastActiveKey = lastState.routes[lastState.index].key;
        const newState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            routeNames.includes(route.routeName) ? 'remove' : 'keep',
        );
        const newActiveKey = newState.routes[newState.index].key;
        if (lastActiveKey === newActiveKey) {
          return newState;
        }
        return { ...newState, isTransitioning: true };
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
      } else if (action.type === 'CLEAR_THREADS') {
        const threadIDs = new Set(action.threadIDs);
        if (!lastState) {
          return lastState;
        }
        const lastActiveKey = lastState.routes[lastState.index].key;
        const newState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            threadIDs.has(getThreadIDFromRoute(route)) ? 'remove' : 'keep',
        );
        const newActiveKey = newState.routes[newState.index].key;
        if (lastActiveKey === newActiveKey) {
          return newState;
        }
        return { ...newState, isTransitioning: true };
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
      clearThreads: (threadIDs: $ReadOnlyArray<string>) => ({
        type: 'CLEAR_THREADS',
        threadIDs,
      }),
    }),
  };
}

export default ChatRouter;
