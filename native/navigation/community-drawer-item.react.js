// @flow

import * as React from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';

import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import { ExpandButton, ExpandButtonDisabled } from './expand-buttons.react.js';
import SubchannelsButton from './subchannels-button.react.js';
import type { MessageListParams } from '../chat/message-list-types.js';
import { SingleLine } from '../components/single-line.react.js';
import { useStyles } from '../themes/colors.js';
import type { TextStyle } from '../types/styles.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData<TextStyle>,
  +toggleExpanded: (threadID: string) => void,
  +expanded: boolean,
  +navigateToThread: (params: MessageListParams) => void,
};

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren, labelStyle, hasSubchannelsButton },
    navigateToThread,
    expanded,
    toggleExpanded,
  } = props;

  const styles = useStyles(unboundStyles);

  const renderItem = React.useCallback(
    ({ item }) => (
      <MemoizedCommunityDrawerItemChat
        key={item.threadInfo.id}
        itemData={item}
        navigateToThread={navigateToThread}
      />
    ),
    [navigateToThread],
  );

  const children = React.useMemo(() => {
    if (!expanded) {
      return null;
    }
    if (hasSubchannelsButton) {
      return (
        <View style={styles.subchannelsButton}>
          <SubchannelsButton threadInfo={threadInfo} />
        </View>
      );
    }
    return <FlatList data={itemChildren} renderItem={renderItem} />;
  }, [
    expanded,
    itemChildren,
    renderItem,
    hasSubchannelsButton,
    styles.subchannelsButton,
    threadInfo,
  ]);

  const onExpandToggled = React.useCallback(() => {
    toggleExpanded(threadInfo.id);
  }, [toggleExpanded, threadInfo.id]);

  const itemExpandButton = React.useMemo(() => {
    if (!itemChildren?.length && !hasSubchannelsButton) {
      return <ExpandButtonDisabled />;
    }
    return <ExpandButton onPress={onExpandToggled} expanded={expanded} />;
  }, [itemChildren?.length, hasSubchannelsButton, onExpandToggled, expanded]);

  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);

  const { uiName } = useResolvedThreadInfo(threadInfo);
  return (
    <View>
      <View style={styles.threadEntry}>
        {itemExpandButton}
        <TouchableOpacity
          onPress={onPress}
          style={styles.textTouchableWrapper}
          onLongPress={onExpandToggled}
        >
          <SingleLine style={labelStyle}>{uiName}</SingleLine>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const unboundStyles = {
  chatView: {
    marginLeft: 16,
  },
  threadEntry: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  textTouchableWrapper: {
    flex: 1,
  },
  subchannelsButton: {
    marginLeft: 24,
    marginBottom: 6,
  },
};

export type CommunityDrawerItemChatProps = {
  +itemData: CommunityDrawerItemData<TextStyle>,
  +navigateToThread: (params: MessageListParams) => void,
};

function CommunityDrawerItemChat(
  props: CommunityDrawerItemChatProps,
): React.Node {
  const [expanded, setExpanded] = React.useState(false);
  const styles = useStyles(unboundStyles);

  const toggleExpanded = React.useCallback(() => {
    setExpanded(isExpanded => !isExpanded);
  }, []);

  return (
    <View style={styles.chatView}>
      <CommunityDrawerItem
        {...props}
        expanded={expanded}
        toggleExpanded={toggleExpanded}
      />
    </View>
  );
}
const MemoizedCommunityDrawerItemChat: React.ComponentType<CommunityDrawerItemChatProps> =
  React.memo(CommunityDrawerItemChat);

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItem);

export default MemoizedCommunityDrawerItem;
