// @flow

import classNames from 'classnames';
import * as React from 'react';
import { IoIosMore } from 'react-icons/io';

import type { ThreadInfo } from 'lib/types/thread-types';

import { useModalContext } from '../modals/modal-provider.react';
import SidebarsModal from '../modals/threads/sidebars/sidebars-modal.react';
import css from './chat-thread-list.css';

type Props = {
  +threadInfo: ThreadInfo,
  +unread: boolean,
};
function ChatThreadListSeeMoreSidebars(props: Props): React.Node {
  const { unread, threadInfo } = props;
  const { pushModal, popModal } = useModalContext();

  const onClick = React.useCallback(
    () =>
      pushModal(
        <SidebarsModal
          defaultTab="My Threads"
          threadID={threadInfo.id}
          onClose={popModal}
        />,
      ),
    [popModal, pushModal, threadInfo.id],
  );
  return (
    <div className={classNames(css.thread, css.sidebar)} onClick={onClick}>
      <a className={css.threadButton}>
        <div
          className={classNames({
            [css.sidebarTitle]: true,
            [css.seeMoreButton]: true,
            [css.unread]: unread,
          })}
        >
          <IoIosMore size="22px" />
          <div className={css.seeMoreText}>See more...</div>
        </div>
      </a>
    </div>
  );
}

export default ChatThreadListSeeMoreSidebars;
