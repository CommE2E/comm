// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import { useStyles } from '../themes/colors';
import { inlineSidebarHeight } from './inline-sidebar-constants';
import { useNavigateToThread } from './message-list-types';

type Props = {
  +threadInfo: ThreadInfo,
  +position: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo } = props;
  const { repliesText } = useInlineEngagementText(threadInfo);

  const navigateToThread = useNavigateToThread();
  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);

  const styles = useStyles(unboundStyles);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;

  return (
    <View style={styles.content}>
      <Button style={styles.sidebar} onPress={onPress}>
        <Text style={[styles.name, unreadStyle]}>{repliesText}</Text>
      </Button>
    </View>
  );
}

const unboundStyles = {
  content: {
    flexDirection: 'row',
    flex: 1,
    height: inlineSidebarHeight,
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
    paddingTop: 1,
    color: 'listForegroundTertiaryLabel',
    fontSize: 16,
    paddingLeft: 4,
    paddingRight: 2,
  },
};

export default InlineSidebar;
