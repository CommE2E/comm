// @flow

import Clipboard from '@react-native-community/clipboard';
import invariant from 'invariant';
import * as React from 'react';

import { createMessageReply } from 'lib/shared/message-utils';
import type { DispatchFunctions, BindServerCall } from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import { displayActionResultModal } from '../navigation/action-result-modal';
import {
  createTooltip,
  type TooltipParams,
  type TooltipRoute,
  type BaseTooltipProps,
} from '../navigation/tooltip.react';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types';
import { onPressReport } from './message-report-utils';
import { navigateToSidebar } from './sidebar-navigation';
import TextMessageTooltipButton from './text-message-tooltip-button.react';

export type TextMessageTooltipModalParams = TooltipParams<{
  +item: ChatTextMessageInfoItemWithHeight,
}>;

const confirmCopy = () => displayActionResultModal('copied!');

function onPressCopy(route: TooltipRoute<'TextMessageTooltipModal'>) {
  Clipboard.setString(route.params.item.messageInfo.text);
  setTimeout(confirmCopy);
}

function onPressReply(
  route: TooltipRoute<'TextMessageTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
  inputState: ?InputState,
) {
  invariant(
    inputState,
    'inputState should be set in TextMessageTooltipModal.onPressReply',
  );
  inputState.addReply(createMessageReply(route.params.item.messageInfo.text));
}

const spec = {
  entries: [
    { id: 'reply', text: 'Reply', onPress: onPressReply },
    {
      id: 'sidebar',
      text: 'Thread',
      onPress: navigateToSidebar,
    },
    { id: 'copy', text: 'Copy', onPress: onPressCopy },
    {
      id: 'report',
      text: 'Report',
      onPress: onPressReport,
    },
  ],
};

const TextMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'TextMessageTooltipModal'>,
> = createTooltip<'TextMessageTooltipModal'>(TextMessageTooltipButton, spec);

export default TextMessageTooltipModal;
