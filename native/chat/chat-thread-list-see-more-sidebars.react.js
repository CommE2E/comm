// @flow

import type { ThreadInfo } from 'lib/types/thread-types';

import * as React from 'react';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Button from '../components/button.react';
import { useColors, useStyles } from '../themes/colors';

type Props = {|
  +threadInfo: ThreadInfo,
  +unread: boolean,
  +onPress: (threadInfo: ThreadInfo) => void,
|};
function ChatThreadListSeeMoreSidebars(props: Props) {
  const { onPress, threadInfo } = props;
  const onPressButton = React.useCallback(() => onPress(threadInfo), [
    onPress,
    threadInfo,
  ]);

  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const unreadStyle = props.unread ? styles.unread : null;
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
  text: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    paddingLeft: 5,
    paddingBottom: 2,
  },
};

export default ChatThreadListSeeMoreSidebars;
