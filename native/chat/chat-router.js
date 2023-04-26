// @flow

import type {
  StackAction,
  Route,
  Router,
  StackRouterOptions,
  StackNavigationState,
  RouterConfigOptions,
  GenericNavigationAction,
} from '@react-navigation/native';
import { StackRouter, CommonActions } from '@react-navigation/native';
import Alert from 'react-native/Libraries/Alert/Alert.js';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import { createNavigateToThreadAction } from './message-list-types.js';
import {
  clearScreensActionType,
  replaceWithThreadActionType,
  clearThreadsActionType,
  pushNewThreadActionType,
} from '../navigation/action-types.js';
import {
  removeScreensFromStack,
  getThreadIDFromRoute,
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
    +threadInfo: ThreadInfo,
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
    +threadInfo: ThreadInfo,
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
  +replaceWithThread: (threadInfo: ThreadInfo) => void,
  +clearThreads: (threadIDs: $ReadOnlyArray<string>) => void,
  +pushNewThread: (threadInfo: ThreadInfo) => void,
};

const displayAlert = () => {
  Alert.alert(
    'You are in edit mode',
    'Exit edit mode before navigating to another screen',
    [{ text: 'OK' }],
    { cancelable: true },
  );
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
        return removeScreensFromStack(lastState, (route: Route<>) =>
          threadIDs.has(getThreadIDFromRoute(route)) ? 'remove' : 'keep',
        );
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
        if (
          result !== null &&
          result?.index &&
          result.index > lastState.index &&
          lastState.routes[lastState.index].params?.disableNavigation
        ) {
          displayAlert();
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
      replaceWithThread: (threadInfo: ThreadInfo) =>
        ({
          type: replaceWithThreadActionType,
          payload: { threadInfo },
        }: ReplaceWithThreadAction),
      clearThreads: (threadIDs: $ReadOnlyArray<string>) => ({
        type: clearThreadsActionType,
        payload: { threadIDs },
      }),
      pushNewThread: (threadInfo: ThreadInfo) =>
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
