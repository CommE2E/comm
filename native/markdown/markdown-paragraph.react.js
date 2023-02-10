// @flow

import * as React from 'react';
import { Text } from 'react-native';

import { MessagePressResponderContext } from '../chat/message-press-responder-context.js';
import { TextMessageMarkdownContext } from '../chat/text-message-markdown-context.js';
import type { TextStyle } from '../types/styles.js';

type Props = {
  +style?: ?TextStyle,
  +children: React.Node,
};
function MarkdownParagraph(props: Props): React.Node {
  const textMessageMarkdownContext = React.useContext(
    TextMessageMarkdownContext,
  );

  const messagePressResponderContext = React.useContext(
    MessagePressResponderContext,
  );

  // We only want to define the onPress handler if the message
  // has any kind of pressable in it
  const onPressMessage = textMessageMarkdownContext?.markdownHasPressable
    ? messagePressResponderContext?.onPressMessage
    : null;

  return (
    <Text
      style={props.style}
      onPress={onPressMessage}
      onLongPress={onPressMessage}
    >
      {props.children}
    </Text>
  );
}

export default MarkdownParagraph;
