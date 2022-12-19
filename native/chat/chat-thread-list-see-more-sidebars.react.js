// @flow

import * as React from 'react';
import { Text } from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';

import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import { useColors, useStyles } from '../themes/colors';
import { sidebarHeight } from './sidebar-item.react';

type Props = {
  +threadInfo: ThreadInfo,
  +unread: boolean,
  +onPress: (threadInfo: ThreadInfo) => void,
};
function ChatThreadListSeeMoreSidebars(props: Props): React.Node {
  const { onPress, threadInfo, unread } = props;
  const onPressButton = React.useCallback(() => onPress(threadInfo), [
    onPress,
    threadInfo,
  ]);

  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const unreadStyle = unread ? styles.unread : null;
  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={styles.button}
      onPress={onPressButton}
    >
      <Icon name="ios-more" size={28} style={styles.icon} />
      <Text style={[styles.text, unreadStyle]}>See more...</Text>
    </Button>
  );
}

const unboundStyles = {
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  button: {
    height: sidebarHeight,
    flexDirection: 'row',
    display: 'flex',
    paddingLeft: 28,
    paddingRight: 18,
    alignItems: 'center',
    backgroundColor: 'listBackground',
  },
  icon: {
    paddingLeft: 5,
    color: 'listForegroundSecondaryLabel',
    width: 35,
  },
  text: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    paddingLeft: 3,
    paddingBottom: 2,
  },
};

export default ChatThreadListSeeMoreSidebars;
