// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import {
  Text,
  TextInput,
  FlatList,
  View,
  TouchableOpacity,
} from 'react-native';

import type { ThreadSearchState } from 'lib/hooks/search-threads.js';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors.js';
import type { SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types.js';

import { useNavigateToThread } from './message-list-types.js';
import Modal from '../components/modal.react.js';
import Search from '../components/search.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import ThreadPill from '../components/thread-pill.react.js';
import { useIndicatorStyle, useStyles } from '../themes/colors.js';
import { waitForModalInputFocus } from '../utils/timers.js';

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
  +createRenderItem: (onPressItem: (threadInfo: ThreadInfo) => void) => (row: {
    +item: U,
    +index: number,
    ...
  }) => React.Node,
  +listData: $ReadOnlyArray<U>,
  +searchState: ThreadSearchState,
  +setSearchState: SetState<ThreadSearchState>,
  +onChangeSearchInputText: (text: string) => mixed,
  +searchPlaceholder?: string,
  +modalTitle: string,
};
function ThreadListModal<U: SidebarInfo | ChatThreadItem>(
  props: Props<U>,
): React.Node {
  const {
    threadInfo: parentThreadInfo,
    searchState,
    setSearchState,
    onChangeSearchInputText,
    listData,
    createRenderItem,
    searchPlaceholder,
    modalTitle,
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

  const renderItem = React.useMemo(
    () => createRenderItem(onPressItem),
    [createRenderItem, onPressItem],
  );

  const styles = useStyles(unboundStyles);
  const indicatorStyle = useIndicatorStyle();
  const navigation = useNavigation();

  return (
    <Modal modalStyle={styles.modal}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>{modalTitle}</Text>
          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.closeButton}
          >
            <SWMansionIcon
              name="cross"
              size={24}
              color={styles.closeIcon.color}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.parentNameWrapper}>
          <ThreadPill fontSize={12} threadInfo={parentThreadInfo} />
        </View>
      </View>
      <View style={styles.body}>
        <Search
          searchText={searchState.text}
          onChangeText={onChangeSearchInputText}
          containerStyle={styles.search}
          placeholder={searchPlaceholder ?? 'Search'}
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
      </View>
    </Modal>
  );
}

const unboundStyles = {
  parentNameWrapper: {
    alignItems: 'flex-start',
  },
  body: {
    paddingHorizontal: 16,
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 32,
    alignItems: 'center',
  },
  header: {
    borderBottomColor: 'subthreadsModalSearch',
    borderBottomWidth: 1,
    height: 94,
    padding: 16,
    justifyContent: 'space-between',
  },
  modal: {
    borderRadius: 8,
    paddingHorizontal: 0,
    backgroundColor: 'subthreadsModalBackground',
    paddingTop: 0,
    justifyContent: 'flex-start',
  },
  search: {
    height: 40,
    marginVertical: 16,
    backgroundColor: 'subthreadsModalSearch',
  },
  title: {
    color: 'listForegroundLabel',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
    alignSelf: 'center',
    marginLeft: 2,
  },
  closeIcon: {
    color: 'subthreadsModalClose',
  },
  closeButton: {
    marginRight: 2,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default ThreadListModal;
