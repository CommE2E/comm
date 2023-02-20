// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useSearchSubchannels } from 'lib/hooks/search-threads.js';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import SubchannelItem from './subchannel-item.react.js';
import ThreadListModal from './thread-list-modal.react.js';
import Button from '../components/button.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

export type SubchannelListModalParams = {
  +threadInfo: ThreadInfo,
};

type Props = {
  +navigation: RootNavigationProp<'SubchannelsListModal'>,
  +route: NavigationRoute<'SubchannelsListModal'>,
};
function SubchannelListModal(props: Props): React.Node {
  const { listData, searchState, setSearchState, onChangeSearchInputText } =
    useSearchSubchannels(props.route.params.threadInfo);

  return (
    <ThreadListModal
      createRenderItem={createRenderItem}
      listData={listData}
      searchState={searchState}
      setSearchState={setSearchState}
      onChangeSearchInputText={onChangeSearchInputText}
      threadInfo={props.route.params.threadInfo}
      searchPlaceholder="Search subchannels"
      modalTitle="Subchannels"
    />
  );
}

const createRenderItem =
  (onPressItem: (threadInfo: ThreadInfo) => void) =>
  // eslint-disable-next-line react/display-name
  (row: { +item: ChatThreadItem, +index: number, ... }) => {
    return <Item subchannelInfo={row.item} onPressItem={onPressItem} />;
  };

function Item(props: {
  onPressItem: (threadInfo: ThreadInfo) => void,
  subchannelInfo: ChatThreadItem,
}): React.Node {
  const { onPressItem, subchannelInfo } = props;
  const { threadInfo } = subchannelInfo;

  const onPressButton = React.useCallback(
    () => onPressItem(threadInfo),
    [onPressItem, threadInfo],
  );

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={styles.subchannel}
      onPress={onPressButton}
    >
      <View style={styles.subchannelRowContainer}>
        <View style={styles.subchannelItemContainer}>
          <SubchannelItem subchannelInfo={subchannelInfo} />
        </View>
      </View>
    </Button>
  );
}

const unboundStyles = {
  subchannel: {
    paddingLeft: 0,
    paddingRight: 5,
  },
  subchannelItemContainer: {
    flex: 1,
  },
  subchannelRowContainer: {
    flex: 1,
    flexDirection: 'row',
  },
};

export default SubchannelListModal;
