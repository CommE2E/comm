// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import type { Dispatch } from 'lib/types/redux-types';
import {
  type NavInfo,
  navInfoPropType,
  updateNavInfoActionType,
} from '../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import { setThreadUnreadStatusActionTypes } from 'lib/actions/activity-actions';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from 'lib/types/activity-types';

import * as React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';

type Props = {|
  +item: ChatThreadItem,
  +active: boolean,
  +navInfo: NavInfo,
  +timeZone: ?string,
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  +setThreadUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload>,
|};
type State = {|
  +menuVisible: boolean,
|};
class ChatThreadListItem extends React.PureComponent<Props, State> {
  static propTypes = {
    item: chatThreadItemPropType.isRequired,
    active: PropTypes.bool.isRequired,
    navInfo: navInfoPropType.isRequired,
    timeZone: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    setThreadUnreadStatus: PropTypes.func.isRequired,
  };
  state = {
    menuVisible: false,
  };

  render() {
    const { item, timeZone } = this.props;
    const lastActivity = shortAbsoluteDate(item.lastUpdatedTime, timeZone);
    const colorSplotchStyle = { backgroundColor: `#${item.threadInfo.color}` };
    const unread = item.threadInfo.currentUser.unread;
    const activeStyle = this.props.active ? css.activeThread : null;
    return (
      <div className={classNames(css.thread, activeStyle)}>
        <a className={css.threadButton} onClick={this.onClick}>
          <div className={css.threadRow}>
            <div className={css.title}>{item.threadInfo.uiName}</div>
            <div className={css.colorSplotch} style={colorSplotchStyle} />
          </div>
          <div className={css.threadRow}>
            <MessagePreview
              messageInfo={item.mostRecentMessageInfo}
              threadInfo={item.threadInfo}
            />
            <div
              className={classNames([
                css.lastActivity,
                unread ? css.black : css.dark,
              ])}
            >
              {lastActivity}
            </div>
          </div>
        </a>
        <div className={css.menu} onMouseLeave={this.hideMenu}>
          <button onClick={this.toggleMenu}>
            <FontAwesomeIcon icon={faEllipsisV} />
          </button>
          <div
            className={classNames(css.menuContent, {
              [css.menuContentVisible]: this.state.menuVisible,
            })}
          >
            <ul>
              <li>
                <button onClick={this.toggleUnreadStatus}>
                  {`Mark as ${
                    item.threadInfo.currentUser.unread ? 'read' : 'unread'
                  }`}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  onClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatch({
      type: updateNavInfoActionType,
      payload: {
        ...this.props.navInfo,
        activeChatThreadID: this.props.item.threadInfo.id,
      },
    });
  };

  toggleMenu = () => {
    this.setState(state => ({ menuVisible: !state.menuVisible }));
  };

  hideMenu = () => {
    this.setState({ menuVisible: false });
  };

  toggleUnreadStatus = () => {
    const { threadInfo, mostRecentMessageInfo } = this.props.item;
    const isUnread = threadInfo.currentUser.unread;
    const request = isUnread
      ? {
          threadID: threadInfo.id,
          unread: !isUnread,
          latestMessage: mostRecentMessageInfo?.id ?? '0',
        }
      : {
          threadID: threadInfo.id,
          unread: !isUnread,
        };
    this.props.dispatchActionPromise(
      setThreadUnreadStatusActionTypes,
      this.props.setThreadUnreadStatus(request),
      undefined,
      {
        threadID: threadInfo.id,
        unread: !threadInfo.currentUser.unread,
      },
    );
    this.hideMenu();
  };
}

export default ChatThreadListItem;
