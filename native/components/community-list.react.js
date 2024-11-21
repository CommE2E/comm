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

const unboundStyles = {
  search: {
    marginBottom: 8,
  },
};

type Props = {
  +threadInfos: $ReadOnlyArray<ThreadInfo>,
  +itemStyle: ViewStyle,
  +searchIndex: SearchIndex,
};

const keyExtractor = (threadInfo: ThreadInfo): string => threadInfo.id;

const getItemLayout = (
  data: ?$ReadOnlyArray<ThreadInfo>,
  index: number,
): { length: number, offset: number, index: number } => {
  return { length: 24, offset: 24 * index, index };
};

function CommunityList(props: Props): React.Node {
  const { threadInfos, itemStyle, searchIndex } = props;
  const styles = useStyles(unboundStyles);
  const indicatorStyle = useIndicatorStyle();

  const [searchText, setSearchText] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<
    $ReadOnlyArray<ThreadInfo>,
  >([]);

  const listData = React.useMemo(
    () => (searchText ? searchResults : threadInfos),
    [searchText, searchResults, threadInfos],
  );

  const onChangeSearchText = React.useCallback(
    (text: string) => {
      invariant(searchIndex, 'searchIndex should be set');
      const results = searchIndex.getSearchResults(text);
      const threadInfoResults = reorderThreadSearchResults(
        threadInfos,
        results,
      );
      setSearchText(text);
      setSearchResults(threadInfoResults);
    },
    [searchIndex, threadInfos],
  );

  const renderItem = React.useCallback(
    ({ item }: { +item: ThreadInfo, ... }): React.Node => (
      <CommunityListItem threadInfo={item} style={itemStyle} />
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
