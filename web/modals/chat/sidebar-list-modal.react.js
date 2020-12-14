// @flow

import classNames from 'classnames';
import * as React from 'react';

import { sidebarInfoSelector } from 'lib/selectors/thread-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import chatThreadListCSS from '../../chat/chat-thread-list.css';
import SidebarItem from '../../chat/sidebar-item.react';
import { useSelector } from '../../redux/redux-utils';
import globalCSS from '../../style.css';
import Modal from '../modal.react';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
  +threadInfo: ThreadInfo,
|};
function SidebarsListModal(props: Props) {
  const { setModal, threadInfo } = props;

  const clearModal = React.useCallback(() => {
    setModal(null);
  }, [setModal]);

  const sidebarInfos = useSelector(
    (state) => sidebarInfoSelector(state)[threadInfo.id] ?? [],
  );

  const sidebars = React.useMemo(
    () =>
      sidebarInfos.map((item) => (
        <div
          className={classNames(
            chatThreadListCSS.thread,
            chatThreadListCSS.sidebar,
          )}
          key={item.threadInfo.id}
          onClick={clearModal}
        >
          <SidebarItem sidebarInfo={item} />
        </div>
      )),
    [clearModal, sidebarInfos],
  );

  return (
    <Modal name="Sidebars" onClose={clearModal} fixedHeight={false}>
      <div
        className={classNames(
          globalCSS['modal-body'],
          globalCSS['resized-modal-body'],
        )}
      >
        <ul className={chatThreadListCSS.list}>{sidebars}</ul>
      </div>
    </Modal>
  );
}

export default SidebarsListModal;
