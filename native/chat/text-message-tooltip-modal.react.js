// @flow

import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';

import { Clipboard } from 'react-native';

import { createTooltip, tooltipHeight } from '../navigation/tooltip.react';
import TextMessageTooltipButton from './text-message-tooltip-button.react';
import { displayActionResultModal } from '../navigation/action-result-modal';

type CustomProps = {
  item: ChatTextMessageInfoItemWithHeight,
};

const confirmCopy = () => displayActionResultModal('copied!');

function onPressCopy(props: CustomProps) {
  Clipboard.setString(props.item.messageInfo.text);
  setTimeout(confirmCopy);
}

const spec = {
  entries: [{ id: 'copy', text: 'Copy', onPress: onPressCopy }],
};

const TextMessageTooltipModal = createTooltip(TextMessageTooltipButton, spec);

const textMessageTooltipHeight = tooltipHeight(spec.entries.length);

export { TextMessageTooltipModal, textMessageTooltipHeight };
