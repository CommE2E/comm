// @flow

import type { ThreadInfo } from 'lib/types/thread-types';

import * as React from 'react';
import Icon from 'react-native-vector-icons/Entypo';
import { Text } from 'react-native';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { useColors, useStyles } from '../themes/colors';
import Button from '../components/button.react';
import { SingleLine } from '../components/single-line.react';

type Props = {|
  +threadInfo: ThreadInfo,
  +lastUpdatedTime: number,
  +onPressItem: (threadInfo: ThreadInfo) => void,
|};
function ChatThreadListSidebar(props: Props) {
  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const { threadInfo, lastUpdatedTime, onPressItem } = props;
  const lastActivity = shortAbsoluteDate(lastUpdatedTime);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;

  const onPress = React.useCallback(() => onPressItem(threadInfo), [
    threadInfo,
    onPressItem,
  ]);

  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={styles.sidebar}
      onPress={onPress}
    >
      <Icon name="align-right" style={styles.icon} size={24} />
      <SingleLine style={[styles.name, unreadStyle]}>
        {threadInfo.uiName}
      </SingleLine>
      <Text style={[styles.lastActivity, unreadStyle]}>{lastActivity}</Text>
    </Button>
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
    marginLeft: 20,
    marginRight: 10,
    alignItems: 'center',
  },
  icon: {
    paddingLeft: 10,
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
