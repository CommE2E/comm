// @flow

import type { AppState } from '../redux-setup';
import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { chatListData } from 'lib/selectors/chat-selectors';

import css from './chat-thread-list.css';
import ChatThreadListItem from './chat-thread-list-item.react';

type Props = {|
  // Redux state
  chatListData: $ReadOnlyArray<ChatThreadItem>,
|};
class ChatThreadList extends React.PureComponent<Props> {

  static propTypes = {
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
  };

  render() {
    const threads = this.props.chatListData.map(item => (
      <ChatThreadListItem
        item={item}
        key={item.threadInfo.id}
      />
    ));
    return (
      <div className={css.container}>
        {threads}
      </div>
    );
  }

}

export default connect((state: AppState) => ({
  chatListData: chatListData(state),
}))(ChatThreadList);
