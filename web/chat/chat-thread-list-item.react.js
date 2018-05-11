// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';

import * as React from 'react';
import classNames from 'classnames';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';

type Props = {|
  item: ChatThreadItem,
|};
class ChatThreadListItem extends React.PureComponent<Props> {

  static propTypes = {
    item: chatThreadItemPropType.isRequired,
  };

  render() {
    const { item } = this.props;
    const lastActivity = shortAbsoluteDate(item.lastUpdatedTime);
    const colorSplotchStyle = { backgroundColor: `#${item.threadInfo.color}` };
    const unread = item.threadInfo.currentUser.unread;
    return (
      <div className={css.thread}>
        <div className={css.threadRow}>
          <div className={css.title}>
            {item.threadInfo.uiName}
          </div>
          <div className={css.colorSplotch} style={colorSplotchStyle} />
        </div>
        <div className={css.threadRow}>
          <MessagePreview
            messageInfo={item.mostRecentMessageInfo}
            threadInfo={item.threadInfo}
          />
          <div className={classNames([
            css.lastActivity,
            unread ? css.black : css.dark,
          ])}>
            {lastActivity}
          </div>
        </div>
      </div>
    );
  }

}

export default ChatThreadListItem;
