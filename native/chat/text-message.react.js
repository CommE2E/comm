// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { ChatMessageInfoItemWithHeight } from './message-list.react';
import { chatMessageItemPropType } from '../selectors/chat-selectors';

import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import Color from 'color';

import { colorIsDark } from 'lib/shared/thread-utils';
import { messageKey, stringForUser } from 'lib/shared/message-utils';
import { messageType } from 'lib/types/message-types';

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
  onFocus: (messageKey: string) => void,
  threadInfo: ThreadInfo,
};
class TextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    onFocus: PropTypes.func.isRequired,
    threadInfo: threadInfoPropType.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageType.TEXT,
      "TextMessage should only be used for messageType.TEXT",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type === messageType.TEXT,
      "TextMessage should only be used for messageType.TEXT",
    );
  }

  render() {
    const isViewer = this.props.item.messageInfo.creator.isViewer;
    let containerStyle = null,
      messageStyle = {},
      textStyle = {};
    if (isViewer) {
      containerStyle = { alignSelf: 'flex-end' };
      messageStyle.backgroundColor = `#${this.props.threadInfo.color}`;
      const darkColor = colorIsDark(this.props.threadInfo.color);
      textStyle.color = darkColor ? 'white' : 'black';
    } else {
      containerStyle = { alignSelf: 'flex-start' };
      messageStyle.backgroundColor = "#DDDDDDBB";
      textStyle.color = 'black';
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
    textStyle.height = this.props.item.textHeight;

    invariant(
      this.props.item.messageInfo.type === messageType.TEXT,
      "TextMessage should only be used for messageType.TEXT",
    );
    const text = this.props.item.messageInfo.text;

    return (
      <View style={containerStyle}>
        {authorName}
        <View
          style={[styles.message, messageStyle]}
          onStartShouldSetResponder={this.onStartShouldSetResponder}
          onResponderGrant={this.onResponderGrant}
          onResponderTerminationRequest={this.onResponderTerminationRequest}
        >
          <Text style={[styles.text, textStyle]}>{text}</Text>
        </View>
      </View>
    );
  }

  onStartShouldSetResponder = () => true;

  onResponderGrant = () => {
    this.props.onFocus(messageKey(this.props.item.messageInfo));
  }

  onResponderTerminationRequest = () => true;

}

const styles = StyleSheet.create({
  text: {
    fontSize: 18,
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
});

export {
  TextMessage,
  textMessageItemHeight,
};
