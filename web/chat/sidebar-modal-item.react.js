// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { SidebarInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';
import css from './sidebar-modal-item.css';

type Props = {
  +sidebar: SidebarInfo,
  +extendArrow?: boolean,
};

function SideBarModalItem(props: Props): React.Node {
  const {
    sidebar: { threadInfo },
    extendArrow = false,
  } = props;
  const {
    currentUser: { unread },
    uiName,
  } = threadInfo;

  const onClick = useOnClickThread(threadInfo);

  const sideBarTextCls = classNames(css.sidebarName, { [css.unread]: unread });
  let arrow;
  if (extendArrow) {
    arrow = (
      <img
        src="images/long_arrow.svg"
        className={css.longArrow}
        alt="sidebar arrow"
      />
    );
  } else {
    arrow = (
      <img src="images/arrow.svg" className={css.arrow} alt="sidebar arrow" />
    );
  }

  return (
    <div className={css.container} onClick={onClick}>
      <div className={css.sidebar}>
        {arrow}
        <div className={sideBarTextCls}>{uiName}</div>
      </div>
    </div>
  );
}

export default SideBarModalItem;
