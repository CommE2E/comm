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

import type { ThreadSearchState } from 'lib/hooks/search-threads';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors';
import type { SetState } from 'lib/types/hook-types';
import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';

import Modal from '../components/modal.react';
import Search from '../components/search.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import { useIndicatorStyle, useStyles } from '../themes/colors';
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
  +searchPlaceholder?: string,
  +modalTitle: string,
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

  const renderItem = React.useMemo(() => createRenderItem(onPressItem), [
    createRenderItem,
    onPressItem,
  ]);

  const styles = useStyles(unboundStyles);
  const indicatorStyle = useIndicatorStyle();
  const navigation = useNavigation();

  return (
    <Modal modalStyle={styles.modal}>
      <View style={styles.header}>
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
  body: {
    paddingHorizontal: 16,
    flex: 1,
  },
  header: {
    borderBottomColor: 'subthreadsModalSearch',
    borderBottomWidth: 1,
    height: 72,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modal: {
    borderRadius: 8,
    paddingHorizontal: 0,
    backgroundColor: 'subthreadsModalBackgroud',
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
