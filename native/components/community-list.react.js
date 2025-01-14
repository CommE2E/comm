// @flow

import invariant from 'invariant';
import * as React from 'react';
import { FlatList } from 'react-native';

import SearchIndex from 'lib/shared/search-index.js';
import { reorderThreadSearchResults } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import CommunityListItem from './community-list-item.react.js';
import Search from './search.react.js';
import { useIndicatorStyle, useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

export type ThreadInfoAndFarcasterChannelID = {
  +threadInfo: ThreadInfo,
  +farcasterChannelID?: ?string,
};

const unboundStyles = {
  search: {
    marginBottom: 8,
  },
};

type Props = {
  +threadInfosAndFCChannelIDs: $ReadOnlyArray<ThreadInfoAndFarcasterChannelID>,
  +itemStyle: ViewStyle,
  +searchIndex: SearchIndex,
};

const keyExtractor = (
  threadInfoAndFarcasterChannelID: ThreadInfoAndFarcasterChannelID,
): string => threadInfoAndFarcasterChannelID.threadInfo.id;

const getItemLayout = (
  data: ?$ReadOnlyArray<ThreadInfoAndFarcasterChannelID>,
  index: number,
): { length: number, offset: number, index: number } => {
  return { length: 24, offset: 24 * index, index };
};

function CommunityList(props: Props): React.Node {
  const { threadInfosAndFCChannelIDs, itemStyle, searchIndex } = props;
  const styles = useStyles(unboundStyles);
  const indicatorStyle = useIndicatorStyle();

  const [searchText, setSearchText] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<
    $ReadOnlyArray<ThreadInfo>,
  >([]);

  const listData = React.useMemo(
    () => (searchText ? searchResults : threadInfosAndFCChannelIDs),
    [searchText, searchResults, threadInfosAndFCChannelIDs],
  );

  const onChangeSearchText = React.useCallback(
    (text: string) => {
      invariant(searchIndex, 'searchIndex should be set');
      const results = searchIndex.getSearchResults(text);
      const threadInfos = threadInfosAndFCChannelIDs.map(
        item => item.threadInfo,
      );
      const threadInfoResults = reorderThreadSearchResults(
        threadInfos,
        results,
      );
      setSearchText(text);
      setSearchResults(threadInfoResults);
    },
    [searchIndex, threadInfosAndFCChannelIDs],
  );

  const renderItem = React.useCallback(
    ({ item }: { +item: ThreadInfoAndFarcasterChannelID, ... }): React.Node => (
      <CommunityListItem
        threadInfo={item.threadInfo}
        style={itemStyle}
        farcasterChannelID={item.farcasterChannelID}
      />
    ),
    [itemStyle],
  );

  let searchComponent = null;
  if (searchIndex) {
    searchComponent = (
      <Search
        searchText={searchText}
        onChangeText={onChangeSearchText}
        containerStyle={styles.search}
        placeholder="Search communities"
      />
    );
  }

  return (
    <>
      {searchComponent}
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        indicatorStyle={indicatorStyle}
      />
    </>
  );
}

const MemoizedCommunityList: React.ComponentType<Props> =
  React.memo(CommunityList);

export default MemoizedCommunityList;
