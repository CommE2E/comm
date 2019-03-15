// @flow

import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { TooltipItemData } from '../components/tooltip.react';
import type {
  TextMessageInfo,
  LocalMessageInfo,
} from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';

import * as React from 'react';
import { Text, StyleSheet, Clipboard } from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import Color from 'color';
import Hyperlink from 'react-native-hyperlink';

import { colorIsDark } from 'lib/shared/thread-utils';
import { messageKey } from 'lib/shared/message-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';

import Tooltip from '../components/tooltip.react';
import ComposedMessage from './composed-message.react';
import RoundedMessageContainer from './rounded-message-container.react';

export type ChatTextMessageInfoItemWithHeight = {|
  itemType: "message",
  messageShapeType: "text",
  messageInfo: TextMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  contentHeight: number,
|};

function textMessageItemHeight(
  item: ChatTextMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { id, creator } = messageInfo;
  const { isViewer } = creator;
  let height = 17 + contentHeight; // for padding, margin, and text
  if (!isViewer && startsCluster) {
    height += 25; // for username
  }
  if (endsCluster) {
    height += 7; // extra padding at the end of a cluster
  }
  if (
    isViewer &&
    id !== null && id !== undefined &&
    item.localMessageInfo &&
    item.localMessageInfo.sendFailed
  ) {
    height += 22; // extra padding for sendFailed
  }
  return height;
}

type Props = {|
  item: ChatTextMessageInfoItemWithHeight,
  focused: bool,
  toggleFocus: (messageKey: string) => void,
|};
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
    this.tooltipConfig = [
      { label: "Copy", onPress: this.onPressCopy },
    ];
  }

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
    const messageBlob = (
      <RoundedMessageContainer item={item}>
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
      </RoundedMessageContainer>
    );

    const sendFailed =
      isViewer &&
      (id === null || id === undefined) &&
      item.localMessageInfo &&
      item.localMessageInfo.sendFailed;

    return (
      <ComposedMessage
        item={item}
        sendFailed={!!sendFailed}
      >
        <Tooltip
          buttonComponent={messageBlob}
          items={this.tooltipConfig}
          labelStyle={styles.popoverLabelStyle}
          onOpenTooltipMenu={this.onFocus}
          onCloseTooltipMenu={this.onBlur}
          innerRef={this.tooltipRef}
        />
      </ComposedMessage>
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

export {
  TextMessage,
  textMessageItemHeight,
};
