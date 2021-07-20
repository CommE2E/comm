// @flow

import invariant from 'invariant';

import { createPendingSidebar } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { DispatchFunctions, ActionFunc } from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import { getDefaultTextMessageRules } from '../markdown/rules.react';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { MessageTooltipRouteNames } from '../navigation/route-names';
import type { TooltipRoute } from '../navigation/tooltip.react';
import type { ChatContextType } from './chat-context';
import { createNavigateToThreadAction } from './message-list-types';
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

export { navigateToSidebar, getSidebarThreadInfo };
