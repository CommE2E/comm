// @flow

import {
  type MessageInfo,
  messageInfoPropType,
  messageTypes,
} from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { Text } from 'react-native';
import PropTypes from 'prop-types';

import { messagePreviewText } from 'lib/shared/message-utils';
import {
  threadIsPersonalChat,
  threadIsTwoPersonChat,
} from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../themes/colors';

type Props = {|
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
  // Redux state
  styles: typeof styles,
|};
class MessagePreview extends React.PureComponent<Props> {
  static propTypes = {
    messageInfo: messageInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const messageInfo: MessageInfo = this.props.messageInfo;
    const unreadStyle = this.props.threadInfo.currentUser.unread
      ? this.props.styles.unread
      : null;
    if (messageInfo.type === messageTypes.TEXT) {
      let usernameText = null;
      if (
        !threadIsPersonalChat(this.props.threadInfo) &&
        !threadIsTwoPersonChat(this.props.threadInfo)
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
          {messageInfo.text}
        </Text>
      );
    } else {
      const preview = messagePreviewText(messageInfo, this.props.threadInfo);
      return (
        <Text
          style={[
            this.props.styles.lastMessage,
            this.props.styles.preview,
            unreadStyle,
          ]}
          numberOfLines={1}
        >
          {preview}
        </Text>
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
