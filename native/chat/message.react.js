// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type { ChatMessageInfoItemWithHeight } from './message-list.react';
import { chatMessageItemPropType } from '../selectors/chat-selectors';

import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  LayoutAnimation,
} from 'react-native';
import { connect } from 'react-redux';
import _isEqual from 'lodash/fp/isEqual';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { longAbsoluteDate } from 'lib/utils/date-utils';
import { messageType } from 'lib/types/message-types';

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
  onFocus: (messageKey: string) => void,
  // Redux state
  threadInfo: ThreadInfo,
};
type State = {
  threadInfo: ThreadInfo,
};
class InnerMessage extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    onFocus: PropTypes.func.isRequired,
    threadInfo: threadInfoPropType.isRequired,
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
          onFocus={this.props.onFocus}
          threadInfo={this.props.threadInfo}
        />
      );
    } else {
      message = (
        <RobotextMessage
          item={this.props.item}
          onFocus={this.props.onFocus}
          threadInfo={this.props.threadInfo}
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

const Message = connect(
  (state: AppState, ownProps: { item: ChatMessageInfoItemWithHeight }) => ({
    threadInfo: state.threadInfos[ownProps.item.messageInfo.threadID],
  }),
)(InnerMessage);

export {
  Message,
  messageItemHeight,
};
