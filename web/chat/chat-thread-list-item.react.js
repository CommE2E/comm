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

import * as React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';
import ChatThreadListItemMenu from './chat-thread-list-item-menu.react';

type Props = {|
  +item: ChatThreadItem,
  +active: boolean,
  +navInfo: NavInfo,
  +timeZone: ?string,
  +dispatch: Dispatch,
|};
class ChatThreadListItem extends React.PureComponent<Props> {
  static propTypes = {
    item: chatThreadItemPropType.isRequired,
    active: PropTypes.bool.isRequired,
    navInfo: navInfoPropType.isRequired,
    timeZone: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
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
        <ChatThreadListItemMenu item={item} />
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
}

export default ChatThreadListItem;
