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
  ComposeThreadRouteName,
} from '../navigation/route-names';
import {
  removeScreensFromStack,
  getThreadIDFromRoute,
} from '../utils/navigation-utils';
import {
  clearScreensActionType,
  replaceWithThreadActionType,
  clearThreadsActionType,
  pushNewThreadActionType,
} from '../navigation/action-types';

type ClearScreensAction = {|
  +type: 'CLEAR_SCREENS',
  +routeNames: $ReadOnlyArray<string>,
  +preserveFocus?: boolean,
|};
type ReplaceWithThreadAction = {|
  +type: 'REPLACE_WITH_THREAD',
  +threadInfo: ThreadInfo,
|};
type ClearThreadsAction = {|
  +type: 'CLEAR_THREADS',
  +threadIDs: $ReadOnlyArray<string>,
  +preserveFocus?: boolean,
|};
type PushNewThreadAction = {|
  +type: 'PUSH_NEW_THREAD',
  +threadInfo: ThreadInfo,
|};
export type ChatRouterNavigationAction =
  | NavigationAction
  | ClearScreensAction
  | ReplaceWithThreadAction
  | ClearThreadsAction
  | PushNewThreadAction;

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
      if (action.type === clearScreensActionType) {
        const { routeNames } = action;
        if (!lastState) {
          return lastState;
        }
        const newState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            routeNames.includes(route.routeName) ? 'remove' : 'keep',
        );
        const isTransitioning =
          lastState.routes[lastState.index].key !==
          newState.routes[newState.index].key;
        return {
          ...newState,
          isTransitioning,
        };
      } else if (action.type === replaceWithThreadActionType) {
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
        const newState = stackRouter.getStateForAction(
          navigateAction,
          clearedState,
        );
        if (!newState) {
          return newState;
        }
        const isTransitioning =
          lastState.routes[lastState.index].key !==
          newState.routes[newState.index].key;
        return {
          ...newState,
          isTransitioning,
        };
      } else if (action.type === clearThreadsActionType) {
        const threadIDs = new Set(action.threadIDs);
        if (!lastState) {
          return lastState;
        }
        const newState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            threadIDs.has(getThreadIDFromRoute(route)) ? 'remove' : 'keep',
        );
        const isTransitioning =
          lastState.routes[lastState.index].key !==
          newState.routes[newState.index].key;
        return {
          ...newState,
          isTransitioning,
        };
      } else if (action.type === pushNewThreadActionType) {
        const { threadInfo } = action;
        if (!lastState) {
          return lastState;
        }
        const clearedState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            route.routeName === ComposeThreadRouteName ? 'remove' : 'break',
        );
        const navigateAction = NavigationActions.navigate({
          routeName: MessageListRouteName,
          key: `${MessageListRouteName}${threadInfo.id}`,
          params: { threadInfo },
        });
        const newState = stackRouter.getStateForAction(
          navigateAction,
          clearedState,
        );
        if (!newState) {
          return newState;
        }
        const isTransitioning =
          lastState.routes[lastState.index].key !==
          newState.routes[newState.index].key;
        return {
          ...newState,
          isTransitioning,
        };
      } else {
        return stackRouter.getStateForAction(action, lastState);
      }
    },
    getActionCreators: (route: NavigationRoute, navStateKey: ?string) => ({
      ...stackRouter.getActionCreators(route, navStateKey),
      clearScreens: (
        routeNames: $ReadOnlyArray<string>,
        preserveFocus: boolean,
      ) => ({
        type: clearScreensActionType,
        routeNames,
        preserveFocus,
      }),
      replaceWithThread: (threadInfo: ThreadInfo) => ({
        type: replaceWithThreadActionType,
        threadInfo,
      }),
      clearThreads: (
        threadIDs: $ReadOnlyArray<string>,
        preserveFocus: boolean,
      ) => ({
        type: clearThreadsActionType,
        threadIDs,
        preserveFocus,
      }),
      pushNewThread: (threadInfo: ThreadInfo) => ({
        type: pushNewThreadActionType,
        threadInfo,
      }),
    }),
  };
}

export default ChatRouter;
