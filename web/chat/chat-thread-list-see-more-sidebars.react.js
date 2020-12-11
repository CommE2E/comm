// @flow

import classNames from 'classnames';
import * as React from 'react';
import DotsThreeHorizontal from 'react-entypo-icons/lib/entypo/DotsThreeHorizontal';

import css from './chat-thread-list.css';

type Props = {|
  +unread: boolean,
|};
function ChatThreadListSeeMoreSidebars(props: Props) {
  const { unread } = props;
  return (
    <div className={classNames(css.thread, css.sidebar)}>
      <a className={css.threadButton}>
        <div className={css.threadRow}>
          <DotsThreeHorizontal className={css.sidebarIcon} />
          <div
            className={classNames([
              css.sidebarTitle,
              unread ? css.unread : null,
            ])}
          >
            See more...
          </div>
        </div>
      </a>
    </div>
  );
}

export default ChatThreadListSeeMoreSidebars;
