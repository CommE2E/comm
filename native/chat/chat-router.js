// @flow

import type { ThreadInfo } from 'lib/types/thread-types';

import { StackRouter, CommonActions } from '@react-navigation/native';

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

function ChatRouter(options) {
  const stackRouter = StackRouter(options);
  return {
    ...stackRouter,
    getStateForAction: (
      lastState,
      action,
      options,
    ) => {
      if (action.type === clearScreensActionType) {
        const { routeNames } = action;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            routeNames.includes(route.name) ? 'remove' : 'keep',
        );
      } else if (action.type === replaceWithThreadActionType) {
        const { threadInfo } = action;
        if (!lastState) {
          return lastState;
        }
        const clearedState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            route.name === ChatThreadListRouteName ? 'keep' : 'remove',
        );
        const navigateAction = CommonActions.navigate({
          name: MessageListRouteName,
          key: `${MessageListRouteName}${threadInfo.id}`,
          params: { threadInfo },
        });
        return stackRouter.getStateForAction(
          clearedState,
          navigateAction,
          options,
        );
      } else if (action.type === clearThreadsActionType) {
        const threadIDs = new Set(action.threadIDs);
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            threadIDs.has(getThreadIDFromRoute(route)) ? 'remove' : 'keep',
        );
      } else if (action.type === pushNewThreadActionType) {
        const { threadInfo } = action;
        if (!lastState) {
          return lastState;
        }
        const clearedState = removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            route.name === ComposeThreadRouteName ? 'remove' : 'break',
        );
        const navigateAction = CommonActions.navigate({
          name: MessageListRouteName,
          key: `${MessageListRouteName}${threadInfo.id}`,
          params: { threadInfo },
        });
        return stackRouter.getStateForAction(
          clearedState,
          navigateAction,
          options,
        );
      } else {
        return stackRouter.getStateForAction(
          lastState,
          action,
          options,
        );
      }
    },
    actionCreators: {
      ...stackRouter.actionCreators,
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
    },
    shouldActionChangeFocus: action => {
      if (action.type === replaceWithThreadActionType) {
        return true;
      } else if (action.type === pushNewThreadActionType) {
        return true;
      }
      return stackRouter.shouldActionChangeFocus(action);
    },
  };
}

export default ChatRouter;
