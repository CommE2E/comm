// @flow

import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';
import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import Icon from 'react-native-vector-icons/Entypo';
import { Text } from 'react-native';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { useColors, useStyles } from '../themes/colors';
import Button from '../components/button.react';
import { SingleLine } from '../components/single-line.react';
import SwipeableThread from './swipeable-thread.react';

type Props = {|
  ...SidebarInfo,
  +onPressItem: (threadInfo: ThreadInfo) => void,
  +onSwipeableWillOpen?: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId?: string,
  +style?: ?ViewStyle,
|};
function ChatThreadListSidebar(props: Props) {
  const { lastUpdatedTime } = props;
  const lastActivity = shortAbsoluteDate(lastUpdatedTime);

  const { threadInfo } = props;
  const styles = useStyles(unboundStyles);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;

  const { onPressItem } = props;
  const onPress = React.useCallback(() => onPressItem(threadInfo), [
    threadInfo,
    onPressItem,
  ]);

  const colors = useColors();
  const sidebar = (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={[styles.sidebar, props.style]}
      onPress={onPress}
    >
      <Icon name="align-right" style={styles.icon} size={24} />
      <SingleLine style={[styles.name, unreadStyle]}>
        {threadInfo.uiName}
      </SingleLine>
      <Text style={[styles.lastActivity, unreadStyle]}>{lastActivity}</Text>
    </Button>
  );

  const {
    mostRecentNonLocalMessage,
    onSwipeableWillOpen,
    currentlyOpenedSwipeableId,
  } = props;
  if (!onSwipeableWillOpen) {
    return sidebar;
  }
  return (
    <SwipeableThread
      threadInfo={threadInfo}
      mostRecentNonLocalMessage={mostRecentNonLocalMessage}
      onSwipeableWillOpen={onSwipeableWillOpen}
      currentlyOpenedSwipeableId={currentlyOpenedSwipeableId}
      iconSize={16}
    >
      {sidebar}
    </SwipeableThread>
  );
}

const unboundStyles = {
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  sidebar: {
    height: 30,
    flexDirection: 'row',
    display: 'flex',
    marginLeft: 25,
    marginRight: 10,
    alignItems: 'center',
  },
  icon: {
    paddingLeft: 5,
    color: 'listForegroundSecondaryLabel',
    width: 35,
  },
  name: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    paddingLeft: 5,
    paddingBottom: 2,
  },
  lastActivity: {
    color: 'listForegroundTertiaryLabel',
    fontSize: 14,
    marginLeft: 10,
  },
};

export default ChatThreadListSidebar;
