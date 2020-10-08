// @flow

import { type NavInfo, navInfoPropType } from '../redux/redux-setup';
import type { Dispatch } from 'lib/types/redux-types';
import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from 'lib/types/activity-types';
import { setThreadUnreadStatus } from 'lib/actions/activity-actions';

import * as React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import { webChatListData } from '../selectors/chat-selectors';

import ChatThreadListItem from './chat-thread-list-item.react';

type BaseProps = {|
  +filterThreads: (threadItem: ThreadInfo) => boolean,
  +emptyItem?: React.ComponentType<{||}>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +chatListData: $ReadOnlyArray<ChatThreadItem>,
  +navInfo: NavInfo,
  +timeZone: ?string,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +setThreadUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload>,
|};
class ChatThreadList extends React.PureComponent<Props> {
  static propTypes = {
    filterThreads: PropTypes.func.isRequired,
    emptyItem: PropTypes.elementType,
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
    navInfo: navInfoPropType.isRequired,
    timeZone: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    setThreadUnreadStatus: PropTypes.func.isRequired,
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
          dispatch={this.props.dispatch}
          dispatchActionPromise={this.props.dispatchActionPromise}
          setThreadUnreadStatus={this.props.setThreadUnreadStatus}
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

export default React.memo<BaseProps>(function ConnectedChatThreadList(
  props: BaseProps,
) {
  const chatListData = useSelector(webChatListData);
  const navInfo = useSelector(state => state.navInfo);
  const timeZone = useSelector(state => state.timeZone);
  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const callSetThreadUnreadStatus = useServerCall(setThreadUnreadStatus);

  return (
    <ChatThreadList
      {...props}
      chatListData={chatListData}
      navInfo={navInfo}
      timeZone={timeZone}
      dispatch={dispatch}
      dispatchActionPromise={dispatchActionPromise}
      setThreadUnreadStatus={callSetThreadUnreadStatus}
    />
  );
});
