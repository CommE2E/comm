// @flow

import * as React from 'react';
import { Text } from 'react-native';

import { MessagePressResponderContext } from '../chat/message-press-responder-context';
import type { TextStyle } from '../types/styles';

type Props = {
  +style?: ?TextStyle,
  +children: React.Node,
};
function MarkdownParagraph(props: Props): React.Node {
  const messagePressResponderContext = React.useContext(
    MessagePressResponderContext,
  );
  const onPressMessage = messagePressResponderContext?.onPressMessage;
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
