// @flow

import type { ChatThreadItem } from '../selectors/chat-selectors';
import { chatThreadItemPropType } from '../selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';

import Button from '../components/button.react';
import MessagePreview from './message-preview.react';
import ColorSplotch from '../components/color-splotch.react';

type Props = {
  data: ChatThreadItem,
  onPressItem: (threadInfo: ThreadInfo) => void,
};
class ChatThreadListItem extends React.PureComponent<Props> {

  static propTypes = {
    data: chatThreadItemPropType.isRequired,
    onPressItem: PropTypes.func.isRequired,
  };

  lastMessage() {
    const mostRecentMessageInfo = this.props.data.mostRecentMessageInfo;
    if (!mostRecentMessageInfo) {
      return (
        <Text style={styles.noMessages} numberOfLines={1}>
          No messages
        </Text>
      );
    }
    return (
      <MessagePreview
        messageInfo={mostRecentMessageInfo}
        threadInfo={this.props.data.threadInfo}
      />
    );
  }

  render() {
    const lastActivity = shortAbsoluteDate(this.props.data.lastUpdatedTime);
    const unreadStyle = this.props.data.threadInfo.currentUser.unread
      ? styles.unread
      : null;
    return (
      <Button
        onPress={this.onPress}
        iosFormat="highlight"
        iosHighlightUnderlayColor="#DDDDDDDD"
        iosActiveOpacity={0.85}
      >
        <View style={styles.container}>
          <View style={styles.row}>
            <Text style={[styles.threadName, unreadStyle]} numberOfLines={1}>
              {this.props.data.threadInfo.name}
            </Text>
            <View style={styles.colorSplotch}>
              <ColorSplotch
                color={this.props.data.threadInfo.color}
                size="small"
              />
            </View>
          </View>
          <View style={styles.row}>
            {this.lastMessage()}
            <Text style={[styles.lastActivity, unreadStyle]}>
              {lastActivity}
            </Text>
          </View>
        </View>
      </Button>
    );
  }

  onPress = () => {
    this.props.onPressItem(this.props.data.threadInfo);
  }

}

const styles = StyleSheet.create({
  container: {
    height: 60,
    paddingLeft: 10,
    paddingTop: 5,
    paddingRight: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threadName: {
    flex: 1,
    paddingLeft: 10,
    fontSize: 20,
    color: '#333333',
  },
  colorSplotch: {
    marginTop: 2,
    marginLeft: 10,
  },
  noMessages: {
    flex: 1,
    paddingLeft: 10,
    fontStyle: 'italic',
    fontSize: 16,
    color: '#666666',
  },
  lastActivity: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 10,
  },
  unread: {
    color: 'black',
    fontWeight: 'bold',
  },
});

export default ChatThreadListItem;
