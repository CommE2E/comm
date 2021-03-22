// @flow

import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import { sidebarInfoSelector } from 'lib/selectors/thread-selectors';
import SearchIndex from 'lib/shared/search-index';
import { threadSearchText } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import chatThreadListCSS from '../../chat/chat-thread-list.css';
import SidebarItem from '../../chat/sidebar-item.react';
import { useSelector } from '../../redux/redux-utils';
import globalCSS from '../../style.css';
import { MagnifyingGlass } from '../../vectors.react';
import Modal from '../modal.react';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
  +threadInfo: ThreadInfo,
|};
function SidebarListModal(props: Props) {
  const { setModal, threadInfo } = props;
  const [searchState, setSearchState] = React.useState({
    text: '',
    results: new Set<string>(),
  });

  const clearModal = React.useCallback(() => {
    setModal(null);
  }, [setModal]);

  const sidebarInfos = useSelector(
    state => sidebarInfoSelector(state)[threadInfo.id] ?? [],
  );
  const userInfos = useSelector(state => state.userStore.userInfos);

  const listData = React.useMemo(() => {
    if (!searchState.text) {
      return sidebarInfos;
    }
    return sidebarInfos.filter(sidebarInfo =>
      searchState.results.has(sidebarInfo.threadInfo.id),
    );
  }, [sidebarInfos, searchState]);

  const sidebars = React.useMemo(
    () =>
      listData.map(item => (
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
    [clearModal, listData],
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
  }, [searchIndex]);

  const onChangeSearchText = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const searchText = event.currentTarget.value;
      setSearchState({
        text: searchText,
        results: new Set(searchIndex.getSearchResults(searchText)),
      });
    },
    [searchIndex],
  );

  const clearQuery = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setSearchState({ text: '', results: [] });
    },
    [],
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
    <Modal name="Sidebars" onClose={clearModal} fixedHeight={false}>
      <div
        className={classNames(
          globalCSS['modal-body'],
          globalCSS['resized-modal-body'],
        )}
      >
        <div>
          <div className={chatThreadListCSS.search}>
            <MagnifyingGlass className={chatThreadListCSS.searchVector} />
            <input
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
