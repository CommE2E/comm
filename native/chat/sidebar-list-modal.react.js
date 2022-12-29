// @flow

import * as React from 'react';
import { TextInput, FlatList, View } from 'react-native';

import { useSearchSidebars } from 'lib/hooks/search-threads';
import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';

import ExtendedArrow from '../components/arrow-extended.react';
import Arrow from '../components/arrow.react';
import Button from '../components/button.react';
import Modal from '../components/modal.react';
import Search from '../components/search.react';
import type { RootNavigationProp } from '../navigation/root-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useColors, useIndicatorStyle, useStyles } from '../themes/colors';
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

  const styles = useStyles(unboundStyles);

  const numOfSidebarsWithExtendedArrow = React.useMemo(
    () => listData.length - 1,
    [listData],
  );

  const renderItem = React.useCallback(
    (row: { item: SidebarInfo, index: number, ... }) => {
      let extendArrow: boolean = false;
      if (row.index < numOfSidebarsWithExtendedArrow) {
        extendArrow = true;
      }
      return (
        <Item
          item={row.item}
          onPressItem={onPressItem}
          extendArrow={extendArrow}
        />
      );
    },
    [onPressItem, numOfSidebarsWithExtendedArrow],
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

function Item(props: {
  item: SidebarInfo,
  onPressItem: (threadInfo: ThreadInfo) => void,
  extendArrow: boolean,
}): React.Node {
  const { item, onPressItem, extendArrow } = props;
  const { threadInfo } = item;

  const onPressButton = React.useCallback(() => onPressItem(threadInfo), [
    onPressItem,
    threadInfo,
  ]);

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  let arrow;
  if (extendArrow) {
    arrow = (
      <View style={styles.extendedArrow}>
        <ExtendedArrow />
      </View>
    );
  } else {
    arrow = (
      <View style={styles.arrow}>
        <Arrow />
      </View>
    );
  }

  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={styles.sidebar}
      onPress={onPressButton}
    >
      <View style={styles.sidebarRowContainer}>
        {arrow}
        <View style={styles.spacer} />
        <View style={styles.sidebarItemContainer}>
          <SidebarItem sidebarInfo={item} />
        </View>
      </View>
    </Button>
  );
}

const unboundStyles = {
  arrow: {
    position: 'absolute',
    top: -12,
  },
  extendedArrow: {
    position: 'absolute',
    top: -6,
  },
  search: {
    marginBottom: 8,
  },
  sidebar: {
    backgroundColor: 'listBackground',
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
};

export default SidebarListModal;
