// @flow

import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';

import { Clipboard, StyleSheet } from 'react-native';

import { createTooltip, tooltipHeight } from '../components/tooltip2.react';
import TextMessageTooltipButton from './text-message-tooltip-button.react';
import { displayActionResultModal } from '../navigation/action-result-modal';

type CustomProps = {
  item: ChatTextMessageInfoItemWithHeight,
};

const confirmCopy = () => displayActionResultModal("copied!");

function onPressCopy(props: CustomProps) {
  Clipboard.setString(props.item.messageInfo.text);
  setTimeout(confirmCopy);
}

const styles = StyleSheet.create({
  popoverLabelStyle: {
    textAlign: 'center',
    color: '#444',
  },
});

const spec = {
  entries: [
    { text: "Copy", onPress: onPressCopy },
  ],
  labelStyle: styles.popoverLabelStyle,
};

const TextMessageTooltipModal = createTooltip(TextMessageTooltipButton, spec);

const textMessageTooltipHeight = tooltipHeight(spec.entries.length);

export {
  TextMessageTooltipModal,
  textMessageTooltipHeight,
};
