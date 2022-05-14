// @flow

import * as React from 'react';

import { sidebarInfoSelector } from '../selectors/thread-selectors';
import SearchIndex from '../shared/search-index';
import { threadSearchText } from '../shared/thread-utils';
import type { SetState } from '../types/hook-types';
import type { SidebarInfo, ThreadInfo } from '../types/thread-types';
import { useSelector } from '../utils/redux-utils';

type SidebarSearchState = {
  +text: string,
  +results: $ReadOnlySet<string>,
};

function useSearchSidebars(
  threadInfo: ThreadInfo,
): {
  listData: $ReadOnlyArray<SidebarInfo>,
  searchState: SidebarSearchState,
  setSearchState: SetState<SidebarSearchState>,
  searchIndex: SearchIndex,
} {
  const [searchState, setSearchState] = React.useState({
    text: '',
    results: new Set<string>(),
  });

  const userInfos = useSelector(state => state.userStore.userInfos);

  const sidebarInfos = useSelector(
    state => sidebarInfoSelector(state)[threadInfo.id] ?? [],
  );

  const listData = React.useMemo(() => {
    if (!searchState.text) {
      return sidebarInfos;
    }
    return sidebarInfos.filter(sidebarInfo =>
      searchState.results.has(sidebarInfo.threadInfo.id),
    );
  }, [sidebarInfos, searchState]);

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

  return React.useMemo(
    () => ({ listData, searchState, setSearchState, searchIndex }),
    [listData, setSearchState, searchState, searchIndex],
  );
}

export { useSearchSidebars };
