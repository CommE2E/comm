// @flow

import type { ChatMessageInfoItemWithHeight } from './message-list.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { TooltipItemData } from '../components/tooltip.react';
import { messageTypes } from 'lib/types/message-types';

import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import Color from 'color';
import Hyperlink from 'react-native-hyperlink';

import { colorIsDark } from 'lib/shared/thread-utils';
import { messageKey } from 'lib/shared/message-utils';
import { stringForUser } from 'lib/shared/user-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';

import Tooltip from '../components/tooltip.react';

function textMessageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  let height = 17 + item.textHeight; // for padding, margin, and text
  if (!item.messageInfo.creator.isViewer && item.startsCluster) {
    height += 25; // for username
  }
  if (item.endsCluster) {
    height += 7; // extra padding at the end of a cluster
  }
  return height;
}

type Props = {
  item: ChatMessageInfoItemWithHeight,
  focused: bool,
  toggleFocus: (messageKey: string) => void,
};
class TextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
  };
  tooltipConfig: $ReadOnlyArray<TooltipItemData>;
  tooltip: ?Tooltip;

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    this.tooltipConfig = [
      { label: "Copy", onPress: this.onPressCopy },
    ];
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
  }

  render() {
    const isViewer = this.props.item.messageInfo.creator.isViewer;
    let containerStyle = null,
      messageStyle = {},
      textCustomStyle = {},
      darkColor = false;
    if (isViewer) {
      containerStyle = styles.rightChatBubble;
      messageStyle.backgroundColor = `#${this.props.item.threadInfo.color}`;
      darkColor = colorIsDark(this.props.item.threadInfo.color);
      textCustomStyle.color = darkColor ? 'white' : 'black';
    } else {
      containerStyle = styles.leftChatBubble;
      messageStyle.backgroundColor = "#DDDDDDBB";
      textCustomStyle.color = 'black';
    }
    let authorName = null;
    if (!isViewer && this.props.item.startsCluster) {
      authorName = (
        <Text style={styles.authorName}>
          {stringForUser(this.props.item.messageInfo.creator)}
        </Text>
      );
    }
    messageStyle.borderTopRightRadius =
      isViewer && !this.props.item.startsCluster ? 0 : 8;
    messageStyle.borderBottomRightRadius =
      isViewer && !this.props.item.endsCluster ? 0 : 8;
    messageStyle.borderTopLeftRadius =
      !isViewer && !this.props.item.startsCluster ? 0 : 8;
    messageStyle.borderBottomLeftRadius =
      !isViewer && !this.props.item.endsCluster ? 0 : 8;
    messageStyle.marginBottom = this.props.item.endsCluster ? 12 : 5;
    if (this.props.focused) {
      messageStyle.backgroundColor =
        Color(messageStyle.backgroundColor).darken(0.15).hex();
    }
    textCustomStyle.height = this.props.item.textHeight;

    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    const text = this.props.item.messageInfo.text;

    const linkStyle = darkColor ? styles.lightLinkText : styles.darkLinkText;
    const textStyle = onlyEmojiRegex.test(text)
      ? styles.emojiOnlyText
      : styles.text;
    const content = (
      <View style={[styles.message, messageStyle]}>
        <Hyperlink linkDefault={true} linkStyle={linkStyle}>
          <Text
            onPress={this.onPress}
            onLongPress={this.onPress}
            style={[textStyle, textCustomStyle]}
          >{text}</Text>
        </Hyperlink>
      </View>
    );

    return (
      <View style={containerStyle}>
        {authorName}
        <Tooltip
          buttonComponent={content}
          items={this.tooltipConfig}
          labelStyle={styles.popoverLabelStyle}
          onOpenTooltipMenu={this.onFocus}
          onCloseTooltipMenu={this.onBlur}
          componentWrapperStyle={containerStyle}
          ref={this.tooltipRef}
        />
      </View>
    );
  }

  tooltipRef = (tooltip: ?Tooltip) => {
    this.tooltip = tooltip;
  }

  onFocus = () => {
    if (!this.props.focused) {
      this.props.toggleFocus(messageKey(this.props.item.messageInfo));
    }
  }

  onBlur = () => {
    if (this.props.focused) {
      this.props.toggleFocus(messageKey(this.props.item.messageInfo));
    }
  }

  onPressCopy = () => {
    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    Clipboard.setString(this.props.item.messageInfo.text);
  }

  onPress = () => {
    const tooltip = this.tooltip;
    invariant(tooltip, "tooltip should be set");
    if (this.props.focused) {
      tooltip.hideModal();
    } else {
      tooltip.openModal();
    }
  }

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
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 12,
  },
  authorName: {
    color: '#777777',
    fontSize: 14,
    paddingHorizontal: 24,
    paddingVertical: 4,
    height: 25,
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
  leftChatBubble: {
    alignSelf: 'flex-start',
  },
  rightChatBubble: {
    alignSelf: 'flex-end',
  },
});

export {
  TextMessage,
  textMessageItemHeight,
};
