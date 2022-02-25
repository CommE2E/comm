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
  +showingSidebarsInline: boolean,
};
function ChatThreadListSeeMoreSidebars(props: Props): React.Node {
  const { unread, showingSidebarsInline, threadInfo } = props;
  const { setModal } = useModalContext();

  const onClick = React.useCallback(
    () => setModal(<SidebarListModal threadInfo={threadInfo} />),
    [setModal, threadInfo],
  );
  const buttonText = showingSidebarsInline ? 'See more...' : 'See sidebars...';
  return (
    <div className={classNames(css.thread, css.sidebar)} onClick={onClick}>
      <a className={css.threadButton}>
        <div className={css.threadRow}>
          <div
            className={classNames([
              css.sidebarTitle,
              unread ? css.unread : null,
            ])}
          >
            {buttonText}
          </div>
        </div>
      </a>
    </div>
  );
}

export default ChatThreadListSeeMoreSidebars;
