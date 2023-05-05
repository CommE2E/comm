// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as React from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { InviteLink } from 'lib/types/link-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { CommunityDrawerItemData } from 'lib/utils/drawer-utils.react.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import { ExpandButton, ExpandButtonDisabled } from './expand-buttons.react.js';
import SubchannelsButton from './subchannels-button.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import type { MessageListParams } from '../chat/message-list-types.js';
import { SingleLine } from '../components/single-line.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles } from '../themes/colors.js';
import type { TextStyle } from '../types/styles.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

export type DrawerItemProps = {
  +itemData: CommunityDrawerItemData<TextStyle>,
  +toggleExpanded: (threadID: string) => void,
  +expanded: boolean,
  +navigateToThread: (params: MessageListParams) => void,
  +navigateToInviteLinksView: (
    community: ThreadInfo,
    inviteLink: InviteLink,
  ) => void,
};

function CommunityDrawerItem(props: DrawerItemProps): React.Node {
  const {
    itemData: {
      threadInfo,
      itemChildren,
      labelStyle,
      hasSubchannelsButton,
      inviteLink,
    },
    navigateToThread,
    expanded,
    toggleExpanded,
    navigateToInviteLinksView,
  } = props;

  const styles = useStyles(unboundStyles);

  const renderItem = React.useCallback(
    ({ item }) => (
      <MemoizedCommunityDrawerItemChat
        key={item.threadInfo.id}
        itemData={item}
        navigateToThread={navigateToThread}
        navigateToInviteLinksView={navigateToInviteLinksView}
      />
    ),
    [navigateToInviteLinksView, navigateToThread],
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

  const shouldRenderAvatars = useShouldRenderAvatars();

  const avatar = React.useMemo(() => {
    if (!shouldRenderAvatars) {
      return null;
    }

    return (
      <View style={styles.avatarContainer}>
        <ThreadAvatar size="micro" threadInfo={threadInfo} />
      </View>
    );
  }, [shouldRenderAvatars, styles.avatarContainer, threadInfo]);

  const insets = useSafeAreaInsets();
  const { showActionSheetWithOptions } = useActionSheet();
  const inviteLinksButton = React.useMemo(() => {
    if (!inviteLink) {
      return null;
    }
    const options = ['Invite Link', 'Cancel'];
    const containerStyle = {
      paddingBottom: insets.bottom,
    };
    return (
      <TouchableOpacity
        onPress={() =>
          showActionSheetWithOptions(
            {
              options,
              cancelButtonIndex: 1,
              containerStyle,
            },
            selectedIndex => {
              if (selectedIndex === 0) {
                navigateToInviteLinksView(threadInfo, inviteLink);
              }
            },
          )
        }
      >
        <SWMansionIcon
          name="menu-vertical"
          size={22}
          style={styles.inviteLinksButton}
        />
      </TouchableOpacity>
    );
  }, [
    insets.bottom,
    inviteLink,
    navigateToInviteLinksView,
    showActionSheetWithOptions,
    styles.inviteLinksButton,
    threadInfo,
  ]);

  return (
    <View>
      <View style={styles.threadEntry}>
        {itemExpandButton}
        <TouchableOpacity
          onPress={onPress}
          style={styles.textTouchableWrapper}
          onLongPress={onExpandToggled}
        >
          {avatar}
          <SingleLine style={labelStyle}>{uiName}</SingleLine>
        </TouchableOpacity>
        {inviteLinksButton}
      </View>
      {children}
    </View>
  );
}

const unboundStyles = {
  avatarContainer: {
    marginRight: 8,
  },
  chatView: {
    marginLeft: 16,
  },
  inviteLinksButton: {
    color: 'drawerItemLabelLevel0',
  },
  threadEntry: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  textTouchableWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subchannelsButton: {
    marginLeft: 24,
    marginBottom: 6,
  },
};

export type CommunityDrawerItemChatProps = {
  +itemData: CommunityDrawerItemData<TextStyle>,
  +navigateToThread: (params: MessageListParams) => void,
  +navigateToInviteLinksView: (
    community: ThreadInfo,
    inviteLink: InviteLink,
  ) => void,
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
