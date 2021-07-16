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
  +unreadIndicator?: boolean,
|};
function SidebarItem(props: Props): React.Node {
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

  const { unreadIndicator } = props;
  const sidebarStyle = React.useMemo(() => {
    if (unreadIndicator) {
      return [styles.sidebar, styles.sidebarWithUnreadIndicator, props.style];
    }
    return [styles.sidebar, props.style];
  }, [
    props.style,
    styles.sidebar,
    styles.sidebarWithUnreadIndicator,
    unreadIndicator,
  ]);

  const sidebarIconStyle = React.useMemo(() => {
    if (unreadIndicator) {
      return [styles.sidebarIcon, styles.sidebarIconWithUnreadIndicator];
    }
    return styles.sidebarIcon;
  }, [
    styles.sidebarIcon,
    styles.sidebarIconWithUnreadIndicator,
    unreadIndicator,
  ]);

  let unreadDot;
  if (unreadIndicator) {
    unreadDot = <UnreadDot unread={threadInfo.currentUser.unread} />;
  }

  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={sidebarStyle}
      onPress={onPress}
    >
      {unreadDot}
      <Icon name="align-right" style={sidebarIconStyle} size={24} />
      <SingleLine style={[styles.name, unreadStyle]}>
        {threadInfo.uiName}
      </SingleLine>
      <Text style={[styles.lastActivity, unreadStyle]}>{lastActivity}</Text>
    </Button>
  );
}

const sidebarHeight = 30;
const unboundStyles = {
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  sidebar: {
    height: sidebarHeight,
    flexDirection: 'row',
    display: 'flex',
    paddingLeft: 28,
    paddingRight: 18,
    alignItems: 'center',
    backgroundColor: 'listBackground',
  },
  sidebarWithUnreadIndicator: {
    paddingLeft: 6,
  },
  sidebarIcon: {
    paddingRight: 5,
    color: 'listForegroundSecondaryLabel',
  },
  sidebarIconWithUnreadIndicator: {
    paddingLeft: 22,
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

export { SidebarItem, sidebarHeight };
