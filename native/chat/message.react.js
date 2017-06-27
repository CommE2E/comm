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
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import { connect } from 'react-redux';
import _isEqual from 'lodash/fp/isEqual';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import Color from 'color';

import { colorIsDark } from 'lib/selectors/thread-selectors';
import { longAbsoluteDate } from 'lib/utils/date-utils';
import { messageKey } from 'lib/shared/message-utils';
import { messageType } from 'lib/types/message-types';

function messageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  userID: ?string,
) {
  let height = 17 + item.textHeight; // for padding, margin, and text
  if (item.messageInfo.creatorID !== userID && item.startsCluster) {
    height += 25; // for username
  }
  if (item.startsConversation) {
    height += 26; // for time bar
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
  // Redux state
  threadInfo: ThreadInfo,
  userID: ?string,
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
    if (nextProps.focused !== this.props.focused) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    let conversationHeader = null;
    if (this.props.item.startsConversation || this.props.focused) {
      conversationHeader = (
        <Text style={styles.conversationHeader}>
          {longAbsoluteDate(this.props.item.messageInfo.time).toUpperCase()}
        </Text>
      );
    }

    const isViewer = this.props.item.messageInfo.isViewer;
    let containerStyle = null,
      messageStyle = {},
      textStyle = {};
    if (isViewer) {
      containerStyle = { alignSelf: 'flex-end' };
      messageStyle.backgroundColor = `#${this.state.threadInfo.color}`;
      const darkColor = colorIsDark(this.state.threadInfo.color);
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
          {this.props.item.messageInfo.creator}
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

    let text;
    if (this.props.item.messageInfo.type === messageType.TEXT) {
      text = this.props.item.messageInfo.text;
    } else {
      // TODO actually handle all cases
      text = "Test";
    }

    return (
      <View>
        {conversationHeader}
        <View style={containerStyle}>
          {authorName}
          <View
            style={[styles.message, messageStyle]}
            onStartShouldSetResponder={this.onStartShouldSetResponder}
            onResponderGrant={this.onResponderGrant}
            onResponderTerminationRequest={this.onResponderTerminationRequest}
          >
            <Text
              numberOfLines={1}
              style={[styles.text, textStyle]}
            >{text}</Text>
          </View>
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
  conversationHeader: {
    color: '#777777',
    fontSize: 14,
    paddingBottom: 7,
    alignSelf: 'center',
    height: 26,
  },
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

const Message = connect(
  (state: AppState, ownProps: { item: ChatMessageInfoItemWithHeight }) => ({
    threadInfo: state.threadInfos[ownProps.item.messageInfo.threadID],
    userID: state.userInfo && state.userInfo.id,
  }),
)(InnerMessage);

export {
  Message,
  messageItemHeight,
};
