// @flow

import * as React from 'react';

import { sidebarInfoSelector } from '../selectors/thread-selectors';
import SearchIndex from '../shared/search-index';
import { threadSearchText } from '../shared/thread-utils';
import type { SetState } from '../types/hook-types';
import type { SidebarInfo, ThreadInfo } from '../types/thread-types';
import { useSelector } from '../utils/redux-utils';

function useSearchSidebars(
  threadInfo: ThreadInfo,
  text: string,
  setSearchText?: SetState<string>,
): {
  listData: $ReadOnlyArray<SidebarInfo>,
  setSearchState: SetState<$ReadOnlySet<string>>,
  onChangeSearchText: (
    text: SyntheticEvent<HTMLInputElement> | string,
  ) => mixed,
} {
  const [searchState, setSearchState] = React.useState(new Set<string>());

  const userInfos = useSelector(state => state.userStore.userInfos);

  const sidebarInfos = useSelector(
    state => sidebarInfoSelector(state)[threadInfo.id] ?? [],
  );

  const listData = React.useMemo(() => {
    if (!text) {
      return sidebarInfos;
    }
    return sidebarInfos.filter(sidebarInfo =>
      searchState.has(sidebarInfo.threadInfo.id),
    );
  }, [sidebarInfos, searchState, text]);

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

  const onChangeSearchText = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement> | string) => {
      let onChangeText;
      if (typeof event === 'string') {
        onChangeText = event;
      } else {
        onChangeText = event.currentTarget.value;
      }

      setSearchState(new Set(searchIndex.getSearchResults(onChangeText)));
      setSearchText?.(onChangeText);
    },
    [searchIndex, setSearchState, setSearchText],
  );

  React.useEffect(() => {
    setSearchState(new Set(searchIndex.getSearchResults(text)));
    setSearchText?.(text);
  }, [searchIndex, setSearchState, setSearchText, text]);

  return React.useMemo(
    () => ({
      listData,
      setSearchState,
      onChangeSearchText,
    }),
    [listData, setSearchState, onChangeSearchText],
  );
}

export { useSearchSidebars };
