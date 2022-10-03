// @flow

import * as React from 'react';
import { TextInput, FlatList, StyleSheet, View } from 'react-native';

import { useSearchSidebars } from 'lib/hooks/search-sidebars';
import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';

import ArrowLong from '../components/arrow-long.react';
import Modal from '../components/modal.react';
import Search from '../components/search.react';
import type { RootNavigationProp } from '../navigation/root-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useIndicatorStyle } from '../themes/colors';
import { waitForModalInputFocus } from '../utils/timers';
import { useNavigateToThread } from './message-list-types';
import { SidebarItem } from './sidebar-item.react';

export type SidebarListModalParams = {
  +threadInfo: ThreadInfo,
};

function keyExtractor(sidebarInfo: SidebarInfo) {
  return sidebarInfo.threadInfo.id;
}
function getItemLayout(data: ?$ReadOnlyArray<SidebarInfo>, index: number) {
  return { length: 24, offset: 24 * index, index };
}

type Props = {
  +navigation: RootNavigationProp<'SidebarListModal'>,
  +route: NavigationRoute<'SidebarListModal'>,
};
function SidebarListModal(props: Props): React.Node {
  const {
    listData,
    searchState,
    setSearchState,
    onChangeSearchInputText,
  } = useSearchSidebars(props.route.params.threadInfo);

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

  const renderItem = React.useCallback(
    (row: { item: SidebarInfo, ... }) => {
      return (
        <View style={styles.sidebarRowContainer}>
          <View style={styles.arrow}>
            <ArrowLong />
          </View>
          <View style={styles.spacer} />
          <View style={styles.sidebarItemContainer}>
            <SidebarItem
              sidebarInfo={row.item}
              onPressItem={onPressItem}
              style={styles.sidebar}
            />
          </View>
        </View>
      );
    },
    [onPressItem],
  );

  const indicatorStyle = useIndicatorStyle();
  return (
    <Modal>
      <Search
        searchText={searchState.text}
        onChangeText={onChangeSearchInputText}
        containerStyle={styles.search}
        placeholder="Search threads"
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
  arrow: {
    position: 'absolute',
    top: -19,
  },
  search: {
    marginBottom: 8,
  },
  sidebar: {
    backgroundColor: 'transparent',
    paddingLeft: 0,
    paddingRight: 5,
  },
  sidebarItemContainer: {
    flex: 1,
  },
  sidebarRowContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  spacer: {
    width: 30,
  },
});

export default SidebarListModal;
