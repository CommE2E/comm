// @flow

import * as React from 'react';
import { TextInput, FlatList, StyleSheet } from 'react-native';

import type { ThreadSearchState } from 'lib/hooks/search-threads';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors';
import type { SetState } from 'lib/types/hook-types';
import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';

import Modal from '../components/modal.react';
import Search from '../components/search.react';
import { useIndicatorStyle } from '../themes/colors';
import { waitForModalInputFocus } from '../utils/timers';
import { useNavigateToThread } from './message-list-types';

function keyExtractor(sidebarInfo: SidebarInfo | ChatThreadItem) {
  return sidebarInfo.threadInfo.id;
}
function getItemLayout(
  data: ?$ReadOnlyArray<SidebarInfo | ChatThreadItem>,
  index: number,
) {
  return { length: 24, offset: 24 * index, index };
}

type Props<U> = {
  +threadInfo: ThreadInfo,
  +createRenderItem: (
    onPressItem: (threadInfo: ThreadInfo) => void,
  ) => (row: {
    +item: U,
    +index: number,
    ...
  }) => React.Node,
  +listData: $ReadOnlyArray<U>,
  +searchState: ThreadSearchState,
  +setSearchState: SetState<ThreadSearchState>,
  +onChangeSearchInputText: (text: string) => mixed,
  +searchPlaceholder: string,
};
function ThreadListModal<U: SidebarInfo | ChatThreadItem>(
  props: Props<U>,
): React.Node {
  const {
    searchState,
    setSearchState,
    onChangeSearchInputText,
    listData,
    createRenderItem,
    searchPlaceholder,
  } = props;

  const searchTextInputRef = React.useRef();
  const setSearchTextInputRef = React.useCallback(
    async (textInput: ?React.ElementRef<typeof TextInput>) => {
      searchTextInputRef.current = textInput;
      if (!textInput) {
        return;
      }
      await waitForModalInputFocus();
      if (searchTextInputRef.current) {
        searchTextInputRef.current.focus();
      }
    },
    [],
  );

  const navigateToThread = useNavigateToThread();
  const onPressItem = React.useCallback(
    (threadInfo: ThreadInfo) => {
      setSearchState({
        text: '',
        results: new Set(),
      });
      if (searchTextInputRef.current) {
        searchTextInputRef.current.blur();
      }
      navigateToThread({ threadInfo });
    },
    [navigateToThread, setSearchState],
  );

  const renderItem = React.useMemo(() => createRenderItem(onPressItem), [
    createRenderItem,
    onPressItem,
  ]);

  const indicatorStyle = useIndicatorStyle();
  return (
    <Modal>
      <Search
        searchText={searchState.text}
        onChangeText={onChangeSearchInputText}
        containerStyle={styles.search}
        placeholder={searchPlaceholder}
        ref={setSearchTextInputRef}
      />
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        indicatorStyle={indicatorStyle}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: 8,
  },
});

export default ThreadListModal;
