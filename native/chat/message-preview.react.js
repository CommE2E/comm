// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { getMessageTitle } from 'lib/shared/message-utils';
import { threadIsGroupChat } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import {
  type MessageInfo,
  messageTypes,
  type ComposableMessageInfo,
  type RobotextMessageInfo,
} from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';
import { connect } from 'lib/utils/redux-utils';

import { SingleLine } from '../components/single-line.react';
import { getDefaultTextMessageRules } from '../markdown/rules.react';
import type { AppState } from '../redux/redux-setup';
import { styleSelector } from '../themes/colors';

type Props = {|
  +messageInfo: MessageInfo,
  +threadInfo: ThreadInfo,
  // Redux state
  +styles: typeof styles,
|};
class MessagePreview extends React.PureComponent<Props> {
  render() {
    const messageInfo: ComposableMessageInfo | RobotextMessageInfo =
      this.props.messageInfo.type === messageTypes.SIDEBAR_SOURCE
        ? this.props.messageInfo.sourceMessage
        : this.props.messageInfo;
    const unreadStyle = this.props.threadInfo.currentUser.unread
      ? this.props.styles.unread
      : null;
    const messageTitle = getMessageTitle(
      messageInfo,
      this.props.threadInfo,
      getDefaultTextMessageRules().simpleMarkdownRules,
    );
    if (messageInfo.type === messageTypes.TEXT) {
      let usernameText = null;
      if (
        threadIsGroupChat(this.props.threadInfo) ||
        this.props.threadInfo.name !== '' ||
        messageInfo.creator.isViewer
      ) {
        const userString = stringForUser(messageInfo.creator);
        const username = `${userString}: `;
        usernameText = (
          <Text style={[this.props.styles.username, unreadStyle]}>
            {username}
          </Text>
        );
      }
      return (
        <Text
          style={[this.props.styles.lastMessage, unreadStyle]}
          numberOfLines={1}
        >
          {usernameText}
          {messageTitle}
        </Text>
      );
    } else {
      invariant(
        messageInfo.type !== messageTypes.SIDEBAR_SOURCE,
        'Sidebar source should not be handled here',
      );
      return (
        <SingleLine
          style={[
            this.props.styles.lastMessage,
            this.props.styles.preview,
            unreadStyle,
          ]}
        >
          {messageTitle}
        </SingleLine>
      );
    }
  }
}

const styles = {
  lastMessage: {
    color: 'listForegroundTertiaryLabel',
    flex: 1,
    fontSize: 16,
    paddingLeft: 10,
  },
  preview: {
    color: 'listForegroundQuaternaryLabel',
  },
  unread: {
    color: 'listForegroundLabel',
  },
  username: {
    color: 'listForegroundQuaternaryLabel',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(MessagePreview);
