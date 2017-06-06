// @flow

import { messageInfoPropType } from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type { MessageInfoWithHeight } from './message-list.react';

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';
import _isEqual from 'lodash/fp/isEqual';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { colorIsDark } from 'lib/selectors/thread-selectors';

type Props = {
  messageInfo: MessageInfoWithHeight,
  // Redux state
  threadInfo: ThreadInfo,
  userID: ?string,
};
type State = {
  threadInfo: ThreadInfo,
};
class Message extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
    messageInfo: messageInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    userID: PropTypes.string,
  };

  constructor(props: Props) {
    super(props);
    invariant(props.threadInfo, "should be set");
    this.state = {
      // On log out, it's possible for the thread to be deauthorized before
      // the log out animation completes. To avoid having rendering issues in
      // that case, we cache the threadInfo in state and don't reset it when the
      // threadInfo is undefined.
      threadInfo: props.threadInfo,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.threadInfo &&
      !_isEqual(nextProps.threadInfo)(this.state.threadInfo)
    ) {
      this.setState({ threadInfo: nextProps.threadInfo });
    }
  }

  static itemHeight(messageInfo: MessageInfoWithHeight, userID: ?string) {
    if (messageInfo.creatorID === userID) {
      return 24 + messageInfo.textHeight;
    } else {
      return 24 + 25 + messageInfo.textHeight;
    }
  }

  render() {
    const isYou = this.props.messageInfo.creatorID === this.props.userID;
    let containerStyle = null,
      messageStyle = null,
      textStyle = null,
      authorName = null;
    if (isYou) {
      containerStyle = { alignSelf: 'flex-end' };
      messageStyle = {
        backgroundColor: `#${this.state.threadInfo.color}`,
      };
      const darkColor = colorIsDark(this.state.threadInfo.color);
      textStyle = darkColor ? styles.whiteText : styles.blackText;
    } else {
      containerStyle = { alignSelf: 'flex-start' };
      textStyle = styles.blackText;
      authorName = (
        <Text style={styles.authorName}>
          {this.props.messageInfo.creator}
        </Text>
      );
    }
    return (
      <View style={[styles.container, containerStyle]}>
        {authorName}
        <View style={[styles.message, messageStyle]}>
          <Text
            numberOfLines={1}
            style={[styles.text, textStyle]}
          >{this.props.messageInfo.text}</Text>
        </View>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  text: {
    fontSize: 18,
    fontFamily: 'Arial',
  },
  whiteText: {
    color: 'white',
  },
  blackText: {
    color: 'black',
  },
  container: {
  },
  message: {
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#AAAAAABB",
    marginBottom: 12,
    marginHorizontal: 12,
  },
  authorName: {
    color: '#777777',
    fontSize: 14,
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
});

export default connect(
  (state: AppState, ownProps: { messageInfo: MessageInfoWithHeight }) => ({
    threadInfo: state.threadInfos[ownProps.messageInfo.threadID],
    userID: state.userInfo && state.userInfo.id,
  }),
)(Message);
