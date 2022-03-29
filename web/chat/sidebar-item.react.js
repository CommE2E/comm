// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { SidebarInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-thread-list.css';

type Props = {
  +sidebarInfo: SidebarInfo,
};
function SidebarItem(props: Props): React.Node {
  const {
    sidebarInfo: { threadInfo },
  } = props;
  const {
    currentUser: { unread },
  } = threadInfo;

  const onClick = useOnClickThread(threadInfo);

  const unreadCls = classNames(css.sidebarTitle, { [css.unread]: unread });

  return (
    <>
      <SWMansionIcon icon="right-angle-arrow" size={28} />
      <div className={css.spacer} />
      <a className={css.threadButtonSidebar} onClick={onClick}>
        <div className={css.threadRow}>
          <div className={unreadCls}>{threadInfo.uiName}</div>
        </div>
      </a>
    </>
  );
}

export default SidebarItem;
