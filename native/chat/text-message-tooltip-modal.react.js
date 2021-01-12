// @flow

import Clipboard from '@react-native-community/clipboard';
import invariant from 'invariant';

import { createMessageReply } from 'lib/shared/message-utils';
import { createPendingThread } from 'lib/shared/thread-utils';
import { threadTypes } from 'lib/types/thread-types';
import type { GlobalAccountUserInfo } from 'lib/types/user-types';
import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import { displayActionResultModal } from '../navigation/action-result-modal';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { MessageListRouteName } from '../navigation/route-names';
import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
  type TooltipRoute,
} from '../navigation/tooltip.react';
import TextMessageTooltipButton from './text-message-tooltip-button.react';
import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';

export type TextMessageTooltipModalParams = TooltipParams<{|
  +item: ChatTextMessageInfoItemWithHeight,
|}>;

const confirmCopy = () => displayActionResultModal('copied!');

function onPressCopy(route: TooltipRoute<'TextMessageTooltipModal'>) {
  Clipboard.setString(route.params.item.messageInfo.text);
  setTimeout(confirmCopy);
}

function onPressReply(
  route: TooltipRoute<'TextMessageTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
  inputState: ?InputState,
) {
  invariant(
    inputState,
    'inputState should be set in TextMessageTooltipModal.onPressReply',
  );
  inputState.addReply(createMessageReply(route.params.item.messageInfo.text));
}

function onPressCreateSidebar(
  route: TooltipRoute<'TextMessageTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
  inputState: ?InputState,
  navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  viewerID: ?string,
) {
  invariant(
    viewerID,
    'viewerID should be set in TextMessageTooltipModal.onPressCreateSidebar',
  );
  createSidebar(route, navigation, viewerID);
}

function createSidebar(
  route: TooltipRoute<'TextMessageTooltipModal'>,
  navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  viewerID: string,
) {
  const { messageInfo, threadInfo } = route.params.item;
  const { id, username } = messageInfo.creator;
  const sourceMessageID = messageInfo.id;
  const { id: parentThreadID, color } = threadInfo;

  invariant(
    username,
    'username should be set in TextMessageTooltipModal.createSidebar',
  );
  const initialMemberUserInfo: GlobalAccountUserInfo = { id, username };

  const pendingSidebarInfo = createPendingThread(
    viewerID,
    threadTypes.SIDEBAR,
    [initialMemberUserInfo],
    parentThreadID,
    color,
  );

  navigation.navigate({
    name: MessageListRouteName,
    params: {
      threadInfo: pendingSidebarInfo,
      sidebarSourceMessageID: sourceMessageID,
    },
    key: `${MessageListRouteName}${pendingSidebarInfo.id}`,
  });
}

const spec = {
  entries: [
    { id: 'copy', text: 'Copy', onPress: onPressCopy },
    { id: 'reply', text: 'Reply', onPress: onPressReply },
    { id: 'sidebar', text: 'Create sidebar', onPress: onPressCreateSidebar },
  ],
};

const TextMessageTooltipModal = createTooltip<'TextMessageTooltipModal'>(
  TextMessageTooltipButton,
  spec,
);

const textMessageTooltipHeight = tooltipHeight(spec.entries.length);

export { TextMessageTooltipModal, textMessageTooltipHeight };
