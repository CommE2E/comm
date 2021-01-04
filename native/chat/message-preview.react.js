// @flow

import PropTypes from 'prop-types';
import * as React from 'react';
import { Text } from 'react-native';

import { messagePreviewText } from 'lib/shared/message-utils';
import { threadIsGroupChat } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import {
  type MessageInfo,
  messageInfoPropType,
  messageTypes,
} from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { connect } from 'lib/utils/redux-utils';
import { firstLine } from 'lib/utils/string-utils';

import { SingleLine } from '../components/single-line.react';
import type { AppState } from '../redux/redux-setup';
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
      const firstMessageLine = firstLine(messageInfo.text);
      return (
        <Text
          style={[this.props.styles.lastMessage, unreadStyle]}
          numberOfLines={1}
        >
          {usernameText}
          {firstMessageLine}
        </Text>
      );
    } else {
      const preview = messagePreviewText(messageInfo, this.props.threadInfo);
      return (
        <SingleLine
          style={[
            this.props.styles.lastMessage,
            this.props.styles.preview,
            unreadStyle,
          ]}
        >
          {preview}
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
