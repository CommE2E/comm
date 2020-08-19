// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import {
  type NavInfo,
  navInfoPropType,
  updateNavInfoActionType,
} from '../redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';

type Props = {|
  item: ChatThreadItem,
  active: boolean,
  navInfo: NavInfo,
  timeZone: ?string,
  dispatchActionPayload: DispatchActionPayload,
|};
class ChatThreadListItem extends React.PureComponent<Props> {
  static propTypes = {
    item: chatThreadItemPropType.isRequired,
    active: PropTypes.bool.isRequired,
    navInfo: navInfoPropType.isRequired,
    timeZone: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  render() {
    const { item, timeZone } = this.props;
    const lastActivity = shortAbsoluteDate(item.lastUpdatedTime, timeZone);
    const colorSplotchStyle = { backgroundColor: `#${item.threadInfo.color}` };
    const unread = item.threadInfo.currentUser.unread;
    const activeStyle = this.props.active ? css.activeThread : null;
    return (
      <a className={classNames(css.thread, activeStyle)} onClick={this.onClick}>
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
    );
  }

  onClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPayload(updateNavInfoActionType, {
      ...this.props.navInfo,
      activeChatThreadID: this.props.item.threadInfo.id,
    });
  };
}

export default ChatThreadListItem;
