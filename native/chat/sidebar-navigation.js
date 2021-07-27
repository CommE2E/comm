// @flow

import invariant from 'invariant';
import * as React from 'react';

import { createPendingSidebar } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { DispatchFunctions, ActionFunc } from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import { getDefaultTextMessageRules } from '../markdown/rules.react';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { MessageTooltipRouteNames } from '../navigation/route-names';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import type { ChatContextType } from './chat-context';
import {
  createNavigateToThreadAction,
  useNavigateToThread,
} from './message-list-types';
import type { ChatMessageInfoItemWithHeight } from './message.react';

function getSidebarThreadInfo(
  sourceMessage: ChatMessageInfoItemWithHeight,
  viewerID?: ?string,
): ThreadInfo {
  const threadCreatedFromMessage = sourceMessage.threadCreatedFromMessage;
  if (threadCreatedFromMessage) {
    return threadCreatedFromMessage;
  }

  invariant(viewerID, 'viewerID should be set');

  const { messageInfo, threadInfo } = sourceMessage;
  return createPendingSidebar(
    messageInfo,
    threadInfo,
    viewerID,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );
}

function navigateToSidebar<RouteName: MessageTooltipRouteNames>(
  route: TooltipRoute<RouteName>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: <F>(serverCall: ActionFunc<F>) => F,
  inputState: ?InputState,
  navigation: AppNavigationProp<RouteName>,
  viewerID: ?string,
  chatContext: ?ChatContextType,
) {
  const threadInfo = getSidebarThreadInfo(route.params.item, viewerID);

  chatContext?.setCurrentTransitionSidebarSourceID(
    route.params.item.messageInfo.id,
  );
  navigation.navigate(createNavigateToThreadAction({ threadInfo }));
}

function useNavigateToSidebar(item: ChatMessageInfoItemWithHeight): () => void {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const threadInfo = React.useMemo(() => getSidebarThreadInfo(item, viewerID), [
    item,
    viewerID,
  ]);
  const navigateToThread = useNavigateToThread();
  return React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);
}

export { navigateToSidebar, getSidebarThreadInfo, useNavigateToSidebar };
