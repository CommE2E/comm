// @flow

import type { ChatMessageInfoItemWithHeight } from './message-list.react';
import { chatMessageItemPropType } from '../selectors/chat-selectors';

import React from 'react';
import { Text, StyleSheet, View, LayoutAnimation } from 'react-native';
import _isEqual from 'lodash/fp/isEqual';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { longAbsoluteDate } from 'lib/utils/date-utils';
import { messageType } from 'lib/types/message-types';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import { TextMessage, textMessageItemHeight } from './text-message.react';
import {
  RobotextMessage,
  robotextMessageItemHeight,
} from './robotext-message.react';

function messageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  let height = 0;
  if (item.messageInfo.type === messageType.TEXT) {
    height += textMessageItemHeight(item, viewerID);
  } else {
    height += robotextMessageItemHeight(item, viewerID);
  }
  if (item.startsConversation) {
    height += 26; // for time bar
  }
  return height;
}

type Props = {
  item: ChatMessageInfoItemWithHeight,
  focused: bool,
  toggleFocus: (messageKey: string) => void,
};
class Message extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
  };

  componentWillReceiveProps(nextProps: Props) {
    if (
      (nextProps.focused || nextProps.item.startsConversation) !==
        (this.props.focused || this.props.item.startsConversation)
    ) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    let conversationHeader = null;
    if (this.props.focused || this.props.item.startsConversation) {
      conversationHeader = (
        <Text style={styles.conversationHeader}>
          {longAbsoluteDate(this.props.item.messageInfo.time).toUpperCase()}
        </Text>
      );
    }
    let message;
    if (this.props.item.messageInfo.type === messageType.TEXT) {
      message = (
        <TextMessage
          item={this.props.item}
          focused={this.props.focused}
          toggleFocus={this.props.toggleFocus}
          threadInfo={this.props.item.threadInfo}
        />
      );
    } else {
      message = (
        <RobotextMessage
          item={this.props.item}
          toggleFocus={this.props.toggleFocus}
          threadInfo={this.props.item.threadInfo}
        />
      );
    }
    return (
      <View>
        {conversationHeader}
        {message}
      </View>
    );
  }

}

const styles = StyleSheet.create({
  conversationHeader: {
    color: '#777777',
    fontSize: 14,
    paddingBottom: 7,
    alignSelf: 'center',
    height: 26,
  },
});

export {
  Message,
  messageItemHeight,
};
