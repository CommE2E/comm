// @flow

import type {
  GenericNavigationAction,
  Route,
  Router,
  RouterConfigOptions,
  StackAction,
  StackNavigationState,
  StackRouterOptions,
} from '@react-navigation/core';
import { CommonActions, StackRouter } from '@react-navigation/native';

import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

import { createNavigateToThreadAction } from './message-list-types.js';
import {
  clearScreensActionType,
  clearThreadsActionType,
  pushNewThreadActionType,
  replaceWithThreadActionType,
} from '../navigation/action-types.js';
import { getRemoveEditMode } from '../navigation/nav-selectors.js';
import {
  getThreadIDFromRoute,
  removeScreensFromStack,
} from '../navigation/navigation-utils.js';
import {
  ChatThreadListRouteName,
  ComposeSubchannelRouteName,
} from '../navigation/route-names.js';

type ClearScreensAction = {
  +type: 'CLEAR_SCREENS',
  +payload: {
    +routeNames: $ReadOnlyArray<string>,
  },
};
type ReplaceWithThreadAction = {
  +type: 'REPLACE_WITH_THREAD',
  +payload: {
    +threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  },
};
type ClearThreadsAction = {
  +type: 'CLEAR_THREADS',
  +payload: {
    +threadIDs: $ReadOnlyArray<string>,
  },
};
type PushNewThreadAction = {
  +type: 'PUSH_NEW_THREAD',
  +payload: {
    +threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  },
};
export type ChatRouterNavigationAction =
  | StackAction
  | ClearScreensAction
  | ReplaceWithThreadAction
  | ClearThreadsAction
  | PushNewThreadAction;

export type ChatRouterNavigationHelpers = {
  +clearScreens: (routeNames: $ReadOnlyArray<string>) => void,
  +replaceWithThread: (
    threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  ) => void,
  +clearThreads: (threadIDs: $ReadOnlyArray<string>) => void,
  +pushNewThread: (
    threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  ) => void,
};

function ChatRouter(
  routerOptions: StackRouterOptions,
): Router<StackNavigationState, ChatRouterNavigationAction> {
  const {
    getStateForAction: baseGetStateForAction,
    actionCreators: baseActionCreators,
    shouldActionChangeFocus: baseShouldActionChangeFocus,
    ...rest
  } = StackRouter(routerOptions);
  return {
    ...rest,
    getStateForAction: (
      lastState: StackNavigationState,
      action: ChatRouterNavigationAction,
      options: RouterConfigOptions,
    ) => {
      if (action.type === clearScreensActionType) {
        const { routeNames } = action.payload;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(lastState, (route: Route<>) =>
          routeNames.includes(route.name) ? 'remove' : 'keep',
        );
      } else if (action.type === replaceWithThreadActionType) {
        const { threadInfo } = action.payload;
        if (!lastState) {
          return lastState;
        }
        const clearedState = removeScreensFromStack(
          lastState,
          (route: Route<>) =>
            route.name === ChatThreadListRouteName ? 'keep' : 'remove',
        );
        const navigateAction = CommonActions.navigate(
          createNavigateToThreadAction({ threadInfo }),
        );
        return baseGetStateForAction(clearedState, navigateAction, options);
      } else if (action.type === clearThreadsActionType) {
        const threadIDs = new Set(action.payload.threadIDs);
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(lastState, (route: Route<>) => {
          const threadID = getThreadIDFromRoute(route);
          if (!threadID) {
            return 'keep';
          }
          return threadIDs.has(threadID) ? 'remove' : 'keep';
        });
      } else if (action.type === pushNewThreadActionType) {
        const { threadInfo } = action.payload;
        if (!lastState) {
          return lastState;
        }
        const clearedState = removeScreensFromStack(
          lastState,
          (route: Route<>) =>
            route.name === ComposeSubchannelRouteName ? 'remove' : 'break',
        );
        const navigateAction = CommonActions.navigate(
          createNavigateToThreadAction({ threadInfo }),
        );
        return baseGetStateForAction(clearedState, navigateAction, options);
      } else {
        const result = baseGetStateForAction(lastState, action, options);
        const removeEditMode = getRemoveEditMode(lastState);

        // We prevent navigating if the user is in edit mode. We don't block
        // navigating back here because it is handled by the `beforeRemove`
        // listener in the `ChatInputBar` component.
        if (
          result !== null &&
          result?.index &&
          result.index > lastState.index &&
          removeEditMode &&
          removeEditMode(action) === 'ignore_action'
        ) {
          return lastState;
        }
        return result;
      }
    },
    actionCreators: {
      ...baseActionCreators,
      clearScreens: (routeNames: $ReadOnlyArray<string>) => ({
        type: clearScreensActionType,
        payload: {
          routeNames,
        },
      }),
      replaceWithThread: (
        threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
      ) =>
        ({
          type: replaceWithThreadActionType,
          payload: { threadInfo },
        }: ReplaceWithThreadAction),
      clearThreads: (threadIDs: $ReadOnlyArray<string>) => ({
        type: clearThreadsActionType,
        payload: { threadIDs },
      }),
      pushNewThread: (
        threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
      ) =>
        ({
          type: pushNewThreadActionType,
          payload: { threadInfo },
        }: PushNewThreadAction),
    },
    shouldActionChangeFocus: (action: GenericNavigationAction) => {
      if (action.type === replaceWithThreadActionType) {
        return true;
      } else if (action.type === pushNewThreadActionType) {
        return true;
      } else {
        return baseShouldActionChangeFocus(action);
      }
    },
  };
}

export default ChatRouter;
