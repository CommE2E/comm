// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import useInlineSidebarText from 'lib/hooks/inline-sidebar-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../components/comm-icon.react';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
import { useStyles } from '../themes/colors';
import { inlineSidebarStyle } from './chat-constants';
import { useNavigateToThread } from './message-list-types';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: $ReadOnlyArray<string>,
  +disabled?: boolean,
};
function InlineSidebar(props: Props): React.Node {
  const { disabled = false, reactions, threadInfo } = props;
  const { repliesText } = useInlineSidebarText(threadInfo);

  const navigateToThread = useNavigateToThread();
  const onPress = React.useCallback(() => {
    if (threadInfo && !disabled) {
      navigateToThread({ threadInfo });
    }
  }, [disabled, navigateToThread, threadInfo]);

  const styles = useStyles(unboundStyles);

  const reactionList = React.useMemo(() => {
    if (!reactions || reactions.length === 0) {
      return null;
    }
    const reactionItems = reactions.map(reaction => {
      return (
        <Text key={reaction} style={styles.reaction}>
          {reaction}
        </Text>
      );
    });
    return <View style={styles.reactionsContainer}>{reactionItems}</View>;
  }, [reactions, styles.reaction, styles.reactionsContainer]);

  const unreadStyle = threadInfo?.currentUser.unread ? styles.unread : null;
  const marginRight = reactionList ? styles.repliesMarginRight : null;
  const repliesStyles = React.useMemo(
    () => [marginRight, styles.repliesText, unreadStyle],
    [marginRight, styles.repliesText, unreadStyle],
  );
  const noThreadInfo = !threadInfo;
  const sidebarInfo = React.useMemo(() => {
    if (noThreadInfo) {
      return null;
    }
    return (
      <>
        <CommIcon style={styles.icon} size={14} name="sidebar-filled" />
        <Text style={repliesStyles}>{repliesText}</Text>
      </>
    );
  }, [noThreadInfo, styles.icon, repliesStyles, repliesText]);
  return (
    <View style={styles.container}>
      <GestureTouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.sidebar}
      >
        {sidebarInfo}
        {reactionList}
      </GestureTouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  container: {
    flexDirection: 'row',
    height: inlineSidebarStyle.height,
    display: 'flex',
    backgroundColor: 'listBackground',
    borderRadius: 16,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  sidebar: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'inlineSidebarBackground',
    padding: 8,
    borderRadius: 16,
    height: inlineSidebarStyle.height,
  },
  icon: {
    color: 'inlineSidebarLabel',
    marginRight: 4,
  },
  repliesText: {
    color: 'inlineSidebarLabel',
    fontSize: 14,
    lineHeight: 22,
  },
  repliesMarginRight: {
    marginRight: 12,
  },
  reaction: {
    marginLeft: 4,
    color: 'inlineSidebarLabel',
  },
  reactionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginLeft: -4,
  },
};

export default InlineSidebar;
