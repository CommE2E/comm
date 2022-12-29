// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useSearchSidebars } from 'lib/hooks/search-threads';
import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';

import ExtendedArrow from '../components/arrow-extended.react';
import Arrow from '../components/arrow.react';
import Button from '../components/button.react';
import type { RootNavigationProp } from '../navigation/root-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useColors, useStyles } from '../themes/colors';
import { SidebarItem } from './sidebar-item.react';
import ThreadListModal from './thread-list-modal.react';

export type SidebarListModalParams = {
  +threadInfo: ThreadInfo,
};

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

  const numOfSidebarsWithExtendedArrow = listData.length - 1;

  const createRenderItem = React.useCallback(
    (
      onPressItem: (threadInfo: ThreadInfo) => void,
      // eslint-disable-next-line react/display-name
    ) => (row: { +item: SidebarInfo, +index: number, ... }) => {
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
    [numOfSidebarsWithExtendedArrow],
  );

  return (
    <ThreadListModal
      createRenderItem={createRenderItem}
      listData={listData}
      searchState={searchState}
      setSearchState={setSearchState}
      onChangeSearchInputText={onChangeSearchInputText}
      threadInfo={props.route.params.threadInfo}
      searchPlaceholder="Search threads"
    />
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
  sidebar: {
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
