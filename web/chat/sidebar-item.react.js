// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { SidebarThreadItem } from 'lib/shared/sidebar-item-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import css from './chat-thread-list.css';
import { useOnClickThread } from '../selectors/thread-selectors.js';

type Props = {
  +sidebarItem: SidebarThreadItem,
  +extendArrow?: boolean,
};
function SidebarItem(props: Props): React.Node {
  const {
    sidebarItem: { threadInfo },
    extendArrow = false,
  } = props;
  const {
    currentUser: { unread },
  } = threadInfo;

  const onClick = useOnClickThread(threadInfo);

  const unreadCls = classNames(css.sidebarTitle, { [css.unread]: unread });
  let arrow;
  if (extendArrow) {
    arrow = (
      <img
        className={css.longArrow}
        src="images/long_arrow.svg"
        alt="thread arrow"
      />
    );
  } else {
    arrow = (
      <img src="images/arrow.svg" className={css.arrow} alt="thread arrow" />
    );
  }
  const { uiName } = useResolvedThreadInfo(threadInfo);
  return (
    <a className={css.sidebarItem} onClick={onClick}>
      {arrow}
      <div className={css.spacer} />
      <div className={css.threadButtonSidebar}>
        <div className={css.threadRow}>
          <div className={unreadCls}>{uiName}</div>
        </div>
      </div>
    </a>
  );
}

export default SidebarItem;
