// @flow

import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';

import { Clipboard, StyleSheet } from 'react-native';

import { createTooltip, tooltipHeight } from '../components/tooltip2.react';
import TextMessageTooltipButton from './text-message-tooltip-button.react';

type CustomProps = {
  item: ChatTextMessageInfoItemWithHeight,
};

function onPressCopy(props: CustomProps) {
  Clipboard.setString(props.item.messageInfo.text);
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
