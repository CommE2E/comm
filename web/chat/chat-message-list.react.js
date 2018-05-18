// @flow

import type { AppState } from '../redux-setup';
import {
  type ChatMessageItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { messageKey } from 'lib/shared/message-utils';

import { webMessageListData } from '../selectors/chat-selectors';
import ChatInputBar from './chat-input-bar.react';
import Message from './message.react';
import css from './chat-message-list.css';

type Props = {|
  messageListData: ?$ReadOnlyArray<ChatMessageItem>,
|};
class ChatMessageList extends React.PureComponent<Props> {

  static propTypes = {
    messageListData: PropTypes.arrayOf(chatMessageItemPropType),
  };

  static keyExtractor(item: ChatMessageItem) {
    if (item.itemType === "loader") {
      return "loader";
    }
    return messageKey(item.messageInfo);
  }

  render() {
    if (!this.props.messageListData) {
      return <div className={css.container} />;
    }
    const messages = this.props.messageListData.map(
      item => <Message item={item} key={ChatMessageList.keyExtractor(item)} />,
    );
    return (
      <div className={css.container}>
        <div className={css.messageContainer}>
          {messages}
        </div>
        <ChatInputBar />
      </div>
    );
  }

}

export default connect((state: AppState) => ({
  messageListData: webMessageListData(state),
}))(ChatMessageList);
