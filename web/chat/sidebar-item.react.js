// @flow

import classNames from 'classnames';
import * as React from 'react';
import AlignRightIcon from 'react-entypo-icons/lib/entypo/AlignRight';

import type { SidebarInfo } from 'lib/types/thread-types';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { useSelector } from '../redux/redux-utils';
import { useOnClickThread } from '../selectors/nav-selectors';
import css from './chat-thread-list.css';

type Props = {|
  +sidebarInfo: SidebarInfo,
|};
function SidebarItem(props: Props) {
  const { threadInfo, lastUpdatedTime } = props.sidebarInfo;
  const threadID = threadInfo.id;

  const onClick = useOnClickThread(threadID);

  const timeZone = useSelector(state => state.timeZone);
  const lastActivity = shortAbsoluteDate(lastUpdatedTime, timeZone);

  const { unread } = threadInfo.currentUser;
  return (
    <a className={css.threadButton} onClick={onClick}>
      <div className={css.threadRow}>
        <AlignRightIcon className={css.sidebarIcon} />
        <div
          className={classNames([css.sidebarTitle, unread ? css.unread : null])}
        >
          {threadInfo.uiName}
        </div>
        <div
          className={classNames([
            css.sidebarLastActivity,
            unread ? css.black : css.dark,
          ])}
        >
          {lastActivity}
        </div>
      </div>
    </a>
  );
}

export default SidebarItem;
