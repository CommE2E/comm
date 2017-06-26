// @flow

import type { AppState } from '../redux-setup';
import type { MessageInfo } from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { StyleSheet, Text } from 'react-native';

import { messageType } from 'lib/types/message-types';

class MessagePreview extends React.PureComponent {

  props: {
    messageInfo: MessageInfo,
    // Redux state
    userID: ?string,
  };
  static propTypes = {
    messageInfo: messageInfoPropType.isRequired,
    userID: PropTypes.string,
  };

  render() {
    const messageInfo = this.props.messageInfo;
    const username = messageInfo.creatorID === this.props.userID
      ? "you: "
      : `${messageInfo.creator || ""}: `;
    if (messageInfo.type === messageType.TEXT) {
      return (
        <Text style={styles.lastMessage} numberOfLines={1}>
          <Text style={styles.username}>{username}</Text>
          {messageInfo.text}
        </Text>
      );
    } else {
      // TODO actually handle all cases
      return (
        <Text style={styles.lastMessage} numberOfLines={1}>
          Test
        </Text>
      );
    }
  }

}

const styles = StyleSheet.create({
  lastMessage: {
    paddingLeft: 10,
    fontSize: 16,
    color: '#666666',
  },
  username: {
    color: '#AAAAAA',
  },
});

export default connect((state: AppState) => ({
  userID: state.userInfo && state.userInfo.id,
}))(MessagePreview);
