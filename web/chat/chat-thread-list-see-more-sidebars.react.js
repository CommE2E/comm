// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import SidebarListModal from '../modals/chat/sidebar-list-modal.react';
import { useModalContext } from '../modals/modal-provider.react';
import css from './chat-thread-list.css';

type Props = {
  +threadInfo: ThreadInfo,
  +unread: boolean,
};
function ChatThreadListSeeMoreSidebars(props: Props): React.Node {
  const { unread, threadInfo } = props;
  const { pushModal } = useModalContext();

  const onClick = React.useCallback(
    () => pushModal(<SidebarListModal threadInfo={threadInfo} />),
    [pushModal, threadInfo],
  );
  return (
    <div className={classNames(css.thread, css.sidebar)} onClick={onClick}>
      <a className={css.threadButton}>
        <div className={css.threadRow}>
          <div
            className={classNames({
              [css.sidebarTitle]: true,
              [css.seeMoreButton]: true,
              [css.unread]: unread,
            })}
          >
            See more...
          </div>
        </div>
      </a>
    </div>
  );
}

export default ChatThreadListSeeMoreSidebars;
