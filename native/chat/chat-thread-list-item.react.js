// @flow

import type { ChatThreadItem } from '../selectors/chat-selectors';
import { chatThreadItemPropType } from '../selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';

import { Button } from '../shared-components';

class ChatThreadListItem extends React.PureComponent {

  props: {
    data: ChatThreadItem,
    userID: ?string,
    onPressItem: (threadInfo: ThreadInfo) => void,
  };
  static propTypes = {
    data: chatThreadItemPropType.isRequired,
    userID: PropTypes.string,
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
    const username = mostRecentMessageInfo.creatorID === this.props.userID
      ? "you: "
      : `${mostRecentMessageInfo.creator || ""}: `;
    return (
      <Text style={styles.lastMessage} numberOfLines={1}>
        <Text style={styles.username}>{username}</Text>
        {mostRecentMessageInfo.text}
      </Text>
    );
  }

  render() {
    const colorSplotchStyle = {
      backgroundColor: `#${this.props.data.threadInfo.color}`,
    };
    const lastActivity = shortAbsoluteDate(this.props.data.lastUpdatedTime);
    return (
      <Button onSubmit={this.onPress} underlayColor="#DDDDDDDD">
        <View style={styles.container}>
          <View style={styles.row}>
            <Text style={styles.threadName} numberOfLines={1}>
              {this.props.data.threadInfo.name}
            </Text>
            <View style={[styles.colorSplotch, colorSplotchStyle]} />
          </View>
          <View style={styles.row}>
            {this.lastMessage()}
            <Text style={styles.lastActivity}>{lastActivity}</Text>
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
    paddingLeft: 10,
    fontSize: 20,
    color: '#333333',
  },
  colorSplotch: {
    height: 18,
    width: 18,
    marginTop: 2,
    justifyContent: 'flex-end',
    borderRadius: 5,
  },
  noMessages: {
    paddingLeft: 10,
    fontStyle: 'italic',
    fontSize: 16,
    color: '#666666',
  },
  lastMessage: {
    paddingLeft: 10,
    fontSize: 16,
    color: '#666666',
  },
  username: {
    color: '#AAAAAA',
  },
  lastActivity: {
    fontSize: 16,
    color: '#666666',
  },
});

export default ChatThreadListItem;
