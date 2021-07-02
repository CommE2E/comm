// @flow

import * as React from 'react';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/Entypo';

import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import Button from '../components/button.react';
import { SingleLine } from '../components/single-line.react';
import UnreadDot from '../components/unread-dot.react';
import { useColors, useStyles } from '../themes/colors';
import type { ViewStyle } from '../types/styles';

type Props = {|
  +sidebarInfo: SidebarInfo,
  +onPressItem: (threadInfo: ThreadInfo) => void,
  +style?: ?ViewStyle,
|};
function SidebarItem(props: Props) {
  const { lastUpdatedTime } = props.sidebarInfo;
  const lastActivity = shortAbsoluteDate(lastUpdatedTime);

  const { threadInfo } = props.sidebarInfo;
  const styles = useStyles(unboundStyles);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;

  const { onPressItem } = props;
  const onPress = React.useCallback(() => onPressItem(threadInfo), [
    threadInfo,
    onPressItem,
  ]);

  const colors = useColors();
  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={[styles.sidebar, props.style]}
      onPress={onPress}
    >
      <UnreadDot unread={threadInfo.currentUser.unread} />
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
    paddingLeft: 28,
    paddingRight: 18,
    alignItems: 'center',
    backgroundColor: 'listBackground',
  },
  icon: {
    paddingRight: 5,
    color: 'listForegroundSecondaryLabel',
  },
  name: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    paddingLeft: 3,
    paddingBottom: 2,
  },
  lastActivity: {
    color: 'listForegroundTertiaryLabel',
    fontSize: 14,
    marginLeft: 10,
  },
};

export default SidebarItem;
