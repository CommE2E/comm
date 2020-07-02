// @flow

import { type AppState, type NavInfo, navInfoPropType } from '../redux-setup';
import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { webChatListData } from '../selectors/chat-selectors';

import ChatThreadListItem from './chat-thread-list-item.react';

type Props = {|
  filterThreads: (threadItem: ThreadInfo) => boolean,
  emptyItem?: React.ComponentType<{||}>,
  // Redux state
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  navInfo: NavInfo,
  timeZone: ?string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class ChatThreadList extends React.PureComponent<Props> {
  static propTypes = {
    filterThreads: PropTypes.func.isRequired,
    emptyItem: PropTypes.element,
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
    navInfo: navInfoPropType.isRequired,
    timeZone: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  render() {
    const threads: React.Node[] = this.props.chatListData
      .filter(item => this.props.filterThreads(item.threadInfo))
      .map(item => (
        <ChatThreadListItem
          item={item}
          active={item.threadInfo.id === this.props.navInfo.activeChatThreadID}
          navInfo={this.props.navInfo}
          timeZone={this.props.timeZone}
          dispatchActionPayload={this.props.dispatchActionPayload}
          key={item.threadInfo.id}
        />
      ));

    if (threads.length === 0 && this.props.emptyItem) {
      const EmptyItem = this.props.emptyItem;
      threads.push(<EmptyItem />);
    }

    return <div>{threads}</div>;
  }
}

export default connect(
  (state: AppState) => ({
    chatListData: webChatListData(state),
    navInfo: state.navInfo,
    timeZone: state.timeZone,
  }),
  null,
  true,
)(ChatThreadList);
