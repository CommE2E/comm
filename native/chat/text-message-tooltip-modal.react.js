// @flow

import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';
import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';
import type { InputState } from '../input/input-state';

import Clipboard from '@react-native-community/clipboard';
import invariant from 'invariant';

import { createMessageReply } from 'lib/shared/message-utils';

import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
  type TooltipEntry,
} from '../navigation/tooltip.react';
import TextMessageTooltipButton from './text-message-tooltip-button.react';
import { displayActionResultModal } from '../navigation/action-result-modal';

export type TextMessageTooltipModalParams = TooltipParams<{|
  +item: ChatTextMessageInfoItemWithHeight,
|}>;

const confirmCopy = () => displayActionResultModal('copied!');

function onPressCopy(props: TextMessageTooltipModalParams) {
  Clipboard.setString(props.item.messageInfo.text);
  setTimeout(confirmCopy);
}

function onPressReply(
  props: TextMessageTooltipModalParams,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
  inputState: ?InputState,
) {
  invariant(
    inputState,
    'inputState should be set in TextMessageTooltipModal.onPressReply',
  );
  inputState.addReply(createMessageReply(props.item.messageInfo.text));
}

const spec = {
  entries: [
    { id: 'copy', text: 'Copy', onPress: onPressCopy },
    { id: 'reply', text: 'Reply', onPress: onPressReply },
  ],
};

const TextMessageTooltipModal = createTooltip<
  'TextMessageTooltipModal',
  TooltipEntry<'TextMessageTooltipModal'>,
>(TextMessageTooltipButton, spec);

const textMessageTooltipHeight = tooltipHeight(spec.entries.length);

export { TextMessageTooltipModal, textMessageTooltipHeight };
