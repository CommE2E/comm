// @flow

import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import { useSearchSidebars } from 'lib/hooks/search-sidebars';
import { sidebarInfoSelector } from 'lib/selectors/thread-selectors';
import SearchIndex from 'lib/shared/search-index';
import { threadSearchText } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import chatThreadListCSS from '../../chat/chat-thread-list.css';
import SidebarItem from '../../chat/sidebar-item.react';
import { useSelector } from '../../redux/redux-utils';
import globalCSS from '../../style.css';
import { MagnifyingGlass } from '../../vectors.react';
import Input from '../input.react';
import { useModalContext } from '../modal-provider.react';
import Modal from '../modal.react';

type Props = {
  +threadInfo: ThreadInfo,
};

function SidebarListModal(props: Props): React.Node {
  const { threadInfo } = props;
  const { listData, searchState, setSearchState } = useSearchSidebars(
    threadInfo,
  );
  const { popModal } = useModalContext();

  const sidebarInfos = useSelector(
    state => sidebarInfoSelector(state)[threadInfo.id] ?? [],
  );
  const userInfos = useSelector(state => state.userStore.userInfos);

  const sidebars = React.useMemo(
    () =>
      listData.map(item => (
        <div
          className={classNames(
            chatThreadListCSS.thread,
            chatThreadListCSS.sidebar,
          )}
          key={item.threadInfo.id}
          onClick={popModal}
        >
          <SidebarItem sidebarInfo={item} />
        </div>
      )),
    [popModal, listData],
  );

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const searchIndex = React.useMemo(() => {
    const index = new SearchIndex();
    for (const sidebarInfo of sidebarInfos) {
      const threadInfoFromSidebarInfo = sidebarInfo.threadInfo;
      index.addEntry(
        threadInfoFromSidebarInfo.id,
        threadSearchText(threadInfoFromSidebarInfo, userInfos, viewerID),
      );
    }
    return index;
  }, [sidebarInfos, userInfos, viewerID]);

  React.useEffect(() => {
    setSearchState(curState => ({
      ...curState,
      results: new Set(searchIndex.getSearchResults(curState.text)),
    }));
  }, [searchIndex, setSearchState]);

  const onChangeSearchText = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const searchText = event.currentTarget.value;
      setSearchState({
        text: searchText,
        results: new Set(searchIndex.getSearchResults(searchText)),
      });
    },
    [searchIndex, setSearchState],
  );

  const clearQuery = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setSearchState({ text: '', results: new Set() });
    },
    [setSearchState],
  );

  let clearQueryButton = null;
  if (searchState.text) {
    clearQueryButton = (
      <a href="#" onClick={clearQuery}>
        <FontAwesomeIcon
          icon={faTimesCircle}
          className={chatThreadListCSS.clearQuery}
        />
      </a>
    );
  }

  return (
    <Modal name="Sidebars" onClose={popModal}>
      <div
        className={classNames(
          globalCSS['modal-body'],
          globalCSS['resized-modal-body'],
        )}
      >
        <div>
          <div className={chatThreadListCSS.search}>
            <MagnifyingGlass className={chatThreadListCSS.searchVector} />
            <Input
              type="text"
              placeholder="Search sidebars"
              value={searchState.text}
              onChange={onChangeSearchText}
            />
            {clearQueryButton}
          </div>
        </div>
        <ul className={chatThreadListCSS.list}>{sidebars}</ul>
      </div>
    </Modal>
  );
}

export default SidebarListModal;
