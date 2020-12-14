// @flow

import classNames from 'classnames';
import * as React from 'react';
import DotsThreeHorizontal from 'react-entypo-icons/lib/entypo/DotsThreeHorizontal';

import SidebarListModal from '../modals/chat/sidebar-list-modal.react';
import css from './chat-thread-list.css';

type Props = {|
  +unread: boolean,
  +setModal: (modal: ?React.Node) => void,
|};
function ChatThreadListSeeMoreSidebars(props: Props) {
  const { unread, setModal } = props;
  const onClick = React.useCallback(
    () => setModal(<SidebarListModal setModal={setModal} />),
    [setModal],
  );
  return (
    <div className={classNames(css.thread, css.sidebar)} onClick={onClick}>
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
