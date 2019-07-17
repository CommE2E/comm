// @flow

import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Color from 'color';
import Hyperlink from 'react-native-hyperlink';

import { colorIsDark } from 'lib/shared/thread-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';

import { RoundedMessageContainer } from './rounded-message-container.react';

type Props = {|
  item: ChatTextMessageInfoItemWithHeight,
  focused: bool,
  onPress: () => void,
  messageRef?: (message: ?View) => void,
|};
class InnerTextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    onPress: PropTypes.func.isRequired,
    messageRef: PropTypes.func,
  };

  render() {
    const { item } = this.props;
    const { text, id, creator } = item.messageInfo;
    const { isViewer } = creator;

    let messageStyle = {}, textCustomStyle = {}, darkColor = false;
    if (isViewer) {
      const threadColor = item.threadInfo.color;
      messageStyle.backgroundColor = `#${threadColor}`;
      darkColor = colorIsDark(threadColor);
      textCustomStyle.color = darkColor ? 'white' : 'black';
    } else {
      messageStyle.backgroundColor = "#DDDDDDBB";
      textCustomStyle.color = 'black';
    }
    if (this.props.focused) {
      messageStyle.backgroundColor =
        Color(messageStyle.backgroundColor).darken(0.15).hex();
    }
    textCustomStyle.height = item.contentHeight;

    const linkStyle = darkColor ? styles.lightLinkText : styles.darkLinkText;
    const textStyle = onlyEmojiRegex.test(text)
      ? styles.emojiOnlyText
      : styles.text;

    const message = (
      <RoundedMessageContainer item={item}>
        <Hyperlink
          linkDefault={true}
          style={[styles.message, messageStyle]}
          linkStyle={linkStyle}
        >
          <Text
            onPress={this.props.onPress}
            onLongPress={this.props.onPress}
            style={[textStyle, textCustomStyle]}
          >{text}</Text>
        </Hyperlink>
      </RoundedMessageContainer>
    );

    const { messageRef } = this.props;
    if (!messageRef) {
      return message;
    }

    return (
      <View onLayout={this.onLayout} ref={messageRef}>
        {message}
      </View>
    );
  }

  onLayout = () => {}

}

const styles = StyleSheet.create({
  text: {
    fontSize: 18,
    fontFamily: 'Arial',
  },
  emojiOnlyText: {
    fontSize: 36,
    fontFamily: 'Arial',
  },
  message: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  darkLinkText: {
    color: "#036AFF",
    textDecorationLine: "underline",
  },
  lightLinkText: {
    color: "#129AFF",
    textDecorationLine: "underline",
  },
  popoverLabelStyle: {
    textAlign: 'center',
    color: '#444',
  },
});

export default InnerTextMessage;
