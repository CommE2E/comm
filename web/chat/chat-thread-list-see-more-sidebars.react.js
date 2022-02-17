// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import SidebarListModal from '../modals/chat/sidebar-list-modal.react';
import { ModalContext } from '../modals/modal-provider.react';
import css from './chat-thread-list.css';

type Props = {
  +threadInfo: ThreadInfo,
  +unread: boolean,
  +showingSidebarsInline: boolean,
};
function ChatThreadListSeeMoreSidebars(props: Props): React.Node {
  const { unread, showingSidebarsInline, threadInfo } = props;
  const modalContext = React.useContext(ModalContext);
  invariant(modalContext, 'modal context should be set');

  const onClick = React.useCallback(
    () => modalContext.setModal(<SidebarListModal threadInfo={threadInfo} />),
    [modalContext, threadInfo],
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
