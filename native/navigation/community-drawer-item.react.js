// @flow

import * as React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types';

import type { MessageListParams } from '../chat/message-list-types';
import { useStyles } from '../themes/colors';
import { ExpandButton, ExpandButtonDisabled } from './expand-buttons.react';

export type CommunityDrawerItemData = {
  +threadInfo: ThreadInfo,
  +itemChildren?: $ReadOnlyArray<CommunityDrawerItemData>,
};

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData,
  +toggleExpanded: (threadID: string) => void,
  +expanded: boolean,
  +navigateToThread: (params: MessageListParams) => void,
};

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: { threadInfo, itemChildren },
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
    return <FlatList data={itemChildren} renderItem={renderItem} />;
  }, [expanded, itemChildren, renderItem]);

  const onExpandToggled = React.useCallback(() => {
    toggleExpanded(threadInfo.id);
  }, [toggleExpanded, threadInfo.id]);

  const itemExpandButton = React.useMemo(() => {
    if (!itemChildren?.length) {
      return <ExpandButtonDisabled />;
    }
    return <ExpandButton onPress={onExpandToggled} expanded={expanded} />;
  }, [itemChildren?.length, expanded, onExpandToggled]);

  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);

  return (
    <View>
      <View style={styles.threadEntry}>
        {itemExpandButton}
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.title}>{threadInfo.uiName}</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

const unboundStyles = {
  chatView: {
    marginLeft: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  threadEntry: {
    flexDirection: 'row',
  },
  title: {
    color: 'drawerItemLabel',
    fontSize: 16,
    lineHeight: 24,
  },
};

export type CommunityDrawerItemChatProps = {
  +itemData: CommunityDrawerItemData,
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
const MemoizedCommunityDrawerItemChat: React.ComponentType<CommunityDrawerItemChatProps> = React.memo(
  CommunityDrawerItemChat,
);

const MemoizedCommunityDrawerItem: React.ComponentType<DrawerItemProps> = React.memo(
  CommunityDrawerItem,
);

export default MemoizedCommunityDrawerItem;
