// @flow

import * as React from 'react';

import { useSearchSidebars } from 'lib/hooks/search-sidebars';
import type { ThreadInfo } from 'lib/types/thread-types';

import SidebarItem from '../../chat/sidebar-item.react';
import { useModalContext } from '../modal-provider.react';
import SearchModal from '../search-modal.react';

type Props = {
  +threadInfo: ThreadInfo,
};

type SidebarModalContentProps = {
  +threadInfo: ThreadInfo,
  +onClose: () => void,
  +searchText: string,
};

function SidebarModalContent(props: SidebarModalContentProps): React.Node {
  const { threadInfo, searchText } = props;
  const { popModal } = useModalContext();
  const { sidebars } = useSearchSidebars(threadInfo, searchText);

  return (
    <ul>
      {sidebars.map(sideBar => (
        <li key={sideBar.threadInfo.id} onClick={popModal}>
          <SidebarItem sidebarInfo={sideBar} />
        </li>
      ))}
    </ul>
  );
}

function SidebarListModal(props: Props): React.Node {
  const { popModal } = useModalContext();
  const { threadInfo } = props;

  const searchSidebarModalContent = React.useCallback(
    (searchSidebarText: string) => (
      <SidebarModalContent
        onClose={popModal}
        threadInfo={threadInfo}
        searchText={searchSidebarText}
      />
    ),
    [popModal, threadInfo],
  );

  return (
    <SearchModal
      name="Sidebars"
      onClose={popModal}
      size="fit-content"
      searchPlaceholder="Search sidebars"
    >
      {searchSidebarModalContent}
    </SearchModal>
  );
}

export default SidebarListModal;
