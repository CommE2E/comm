// @flow

import invariant from 'invariant';

import { createPendingSidebar } from 'lib/shared/thread-utils';
import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { MessageListRouteName } from '../navigation/route-names';
import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
  type TooltipRoute,
} from '../navigation/tooltip.react';
import RobotextMessageTooltipButton from './robotext-message-tooltip-button.react';
import type { ChatRobotextMessageInfoItemWithHeight } from './robotext-message.react';

export type RobotextMessageTooltipModalParams = TooltipParams<{|
  +item: ChatRobotextMessageInfoItemWithHeight,
  +robotext: string,
|}>;

function onPressCreateSidebar(
  route: TooltipRoute<'RobotextMessageTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
  inputState: ?InputState,
  navigation: AppNavigationProp<'RobotextMessageTooltipModal'>,
  viewerID: ?string,
) {
  invariant(
    viewerID,
    'viewerID should be set in RobotextMessageTooltipModal.onPressCreateSidebar',
  );
  const { messageInfo, threadInfo } = route.params.item;
  const pendingSidebarInfo = createPendingSidebar(
    messageInfo,
    threadInfo,
    viewerID,
  );
  const initialMessageID = messageInfo.id;

  navigation.navigate({
    name: MessageListRouteName,
    params: {
      threadInfo: pendingSidebarInfo,
      sidebarSourceMessageID: initialMessageID,
    },
    key: `${MessageListRouteName}${pendingSidebarInfo.id}`,
  });
}

const spec = {
  entries: [
    { id: 'sidebar', text: 'Create sidebar', onPress: onPressCreateSidebar },
  ],
};

const RobotextMessageTooltipModal = createTooltip<
  'RobotextMessageTooltipModal',
>(RobotextMessageTooltipButton, spec);

const robotextMessageTooltipHeight = tooltipHeight(spec.entries.length);

export { RobotextMessageTooltipModal, robotextMessageTooltipHeight };
