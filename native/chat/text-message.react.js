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
import Icon from 'react-native-vector-icons/Feather';

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
    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    const { text, id, creator } = this.props.item.messageInfo;
    const threadColor = this.props.item.threadInfo.color;

    const { isViewer } = creator;
    let alignStyle = null,
      messageStyle = {},
      textCustomStyle = {},
      darkColor = false;
    if (isViewer) {
      alignStyle = styles.rightChatBubble;
      messageStyle.backgroundColor = `#${threadColor}`;
      darkColor = colorIsDark(threadColor);
      textCustomStyle.color = darkColor ? 'white' : 'black';
    } else {
      alignStyle = styles.leftChatBubble;
      messageStyle.backgroundColor = "#DDDDDDBB";
      textCustomStyle.color = 'black';
    }
    const containerStyle = [
      styles.alignment,
      { marginBottom: this.props.item.endsCluster ? 12 : 5 },
    ];
    let authorName = null;
    if (!isViewer && this.props.item.startsCluster) {
      authorName = (
        <Text style={styles.authorName}>
          {stringForUser(creator)}
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
    if (this.props.focused) {
      messageStyle.backgroundColor =
        Color(messageStyle.backgroundColor).darken(0.15).hex();
    }
    textCustomStyle.height = this.props.item.textHeight;

    let deliveryIcon = null;
    if (isViewer) {
      let deliveryIconName;
      if (id !== null && id !== undefined) {
        deliveryIconName = "check-circle";
      } else {
        const sendFailed = this.props.item.localMessageInfo
          ? this.props.item.localMessageInfo.sendFailed
          : null;
        deliveryIconName = sendFailed ? "x-circle" : "circle";
      }
      deliveryIcon = (
        <View style={styles.iconContainer}>
          <Icon
            name={deliveryIconName}
            style={[styles.icon, { color: `#${threadColor}` }]}
          />
        </View>
      );
    }

    const linkStyle = darkColor ? styles.lightLinkText : styles.darkLinkText;
    const textStyle = onlyEmojiRegex.test(text)
      ? styles.emojiOnlyText
      : styles.text;
    const messageBlob = (
      <Hyperlink
        linkDefault={true}
        style={[styles.message, messageStyle]}
        linkStyle={linkStyle}
      >
        <Text
          onPress={this.onPress}
          onLongPress={this.onPress}
          style={[textStyle, textCustomStyle]}
        >{text}</Text>
      </Hyperlink>
    );

    return (
      <View style={containerStyle}>
        {authorName}
        <View style={[styles.content, alignStyle]}>
          <View style={[styles.messageBlobContainer, alignStyle]}>
            <Tooltip
              buttonComponent={messageBlob}
              items={this.tooltipConfig}
              labelStyle={styles.popoverLabelStyle}
              onOpenTooltipMenu={this.onFocus}
              onCloseTooltipMenu={this.onBlur}
              ref={this.tooltipRef}
            />
          </View>
          {deliveryIcon}
        </View>
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
  alignment: {
    marginLeft: 12,
    marginRight: 7,
  },
  message: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 5,
    overflow: 'hidden',
  },
  messageBlobContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  authorName: {
    color: '#777777',
    fontSize: 14,
    paddingHorizontal: 12,
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
    justifyContent: 'flex-start',
  },
  rightChatBubble: {
    justifyContent: 'flex-end',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    textAlign: 'center',
  },
  iconContainer: {
    marginLeft: 2,
    width: 16,
  },
});

export {
  TextMessage,
  textMessageItemHeight,
};
