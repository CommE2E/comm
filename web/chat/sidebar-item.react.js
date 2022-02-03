// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { SidebarInfo } from 'lib/types/thread-types';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { useSelector } from '../redux/redux-utils';
import { useOnClickThread } from '../selectors/nav-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-thread-list.css';

type Props = {
  +sidebarInfo: SidebarInfo,
};
function SidebarItem(props: Props): React.Node {
  const { threadInfo, lastUpdatedTime } = props.sidebarInfo;
  const threadID = threadInfo.id;

  const onClick = useOnClickThread(threadID);

  const timeZone = useSelector(state => state.timeZone);
  const lastActivity = shortAbsoluteDate(lastUpdatedTime, timeZone);

  const { unread } = threadInfo.currentUser;
  const unreadCls = classNames(css.sidebarTitle, { [css.unread]: unread });
  return (
    <>
      <SWMansionIcon icon="right-angle-arrow" size={28} />
      <a className={css.threadButtonSidebar} onClick={onClick}>
        <div className={css.threadRow}>
          <div className={unreadCls}>{threadInfo.uiName}</div>
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
    </>
  );
}

export default SidebarItem;
