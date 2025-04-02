// @flow

import * as React from 'react';
import { View } from 'react-native';

import ComposedMessage from './composed-message.react.js';
import { useTextMessageMarkdownRules } from './message-list-types.js';
import {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
} from './rounded-corners.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import Markdown from '../markdown/markdown.react.js';
import { useStyles } from '../themes/colors.js';
import { type ChatComposedMessageInfoItemWithHeight } from '../types/chat-types.js';

type Props = {
  +item: ChatComposedMessageInfoItemWithHeight,
};

function DeletedMessage(props: Props): React.Node {
  const { item } = props;

  const cornerStyle = React.useMemo(
    () => getRoundedContainerStyle(filterCorners(allCorners, item)),
    [item],
  );

  const rules = useTextMessageMarkdownRules(true);

  const styles = useStyles(unboundStyles);
  const containerStyle = React.useMemo(
    () => [styles.message, cornerStyle],
    [cornerStyle, styles.message],
  );
  const text = '*Deleted message*';
  return (
    <ComposedMessage
      item={item}
      sendFailed={false}
      focused={false}
      swipeOptions="none"
      shouldDisplayPinIndicator={false}
    >
      <View style={containerStyle}>
        <SWMansionIcon name="block-2" size={16} style={styles.icon} />
        <Markdown style={styles.text} rules={rules}>
          {text}
        </Markdown>
      </View>
    </ComposedMessage>
  );
}

const unboundStyles = {
  icon: {
    marginRight: 4,
    color: 'deletedMessageText',
  },
  text: {
    fontFamily: 'Arial',
    fontSize: 18,
    color: 'deletedMessageText',
  },
  message: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'deletedMessageBackground',
    flexDirection: 'row',
    alignItems: 'center',
  },
};

export { DeletedMessage };
