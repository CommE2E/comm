// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import { useStyles } from '../themes/colors';
import { inlineSidebarHeight } from './chat-constants';
import { useNavigateToThread } from './message-list-types';

type Props = {
  +threadInfo: ThreadInfo,
  +position: 'left' | 'right',
};
function InlineEngagement(props: Props): React.Node {
  const { threadInfo, position } = props;
  const { repliesText } = useInlineEngagementText(threadInfo);

  const navigateToThread = useNavigateToThread();
  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);

  const styles = useStyles(unboundStyles);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;
  const contentStyles = [styles.content, styles[position]];

  return (
    <View style={contentStyles}>
      <Button style={styles.sidebar} onPress={onPress}>
        <SWMansionIcon size={14} color="white" name="sidebar-filled" />
        <Text style={[styles.name, unreadStyle]}>{repliesText}</Text>
      </Button>
    </View>
  );
}

const unboundStyles = {
  content: {
    flexDirection: 'row',
    height: inlineSidebarHeight,
    backgroundColor: 'inlineEngagementBackground',
    borderRadius: 28,
    padding: 8,
    position: 'absolute',
    bottom: -29,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  sidebar: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    color: 'listForegroundTertiaryLabel',
  },
  name: {
    color: 'listForegroundLabel',
    paddingTop: 1,
    fontSize: 14,
    paddingLeft: 4,
    paddingRight: 2,
  },
  left: {
    left: 0,
  },
  right: {
    right: 20,
  },
};

export default InlineEngagement;
