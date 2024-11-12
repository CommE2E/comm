// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { SidebarThreadItem } from 'lib/shared/sidebar-item-utils.js';
import { shortAbsoluteDate } from 'lib/utils/date-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import SingleLine from '../components/single-line.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +sidebarItem: SidebarThreadItem,
};
function SidebarItem(props: Props): React.Node {
  const { lastUpdatedTime } = props.sidebarItem;

  const lastActivity = React.useMemo(
    () => shortAbsoluteDate(lastUpdatedTime),
    [lastUpdatedTime],
  );

  const { threadInfo } = props.sidebarItem;
  const { uiName } = useResolvedThreadInfo(threadInfo);
  const styles = useStyles(unboundStyles);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;

  const singleLineStyle = React.useMemo(
    () => [styles.name, unreadStyle],
    [styles.name, unreadStyle],
  );

  const lastActivityStyle = React.useMemo(
    () => [styles.lastActivity, unreadStyle],
    [styles.lastActivity, unreadStyle],
  );

  const sidebarItem = React.useMemo(
    () => (
      <View style={styles.itemContainer}>
        <SingleLine style={singleLineStyle}>{uiName}</SingleLine>
        <Text style={lastActivityStyle}>{lastActivity}</Text>
      </View>
    ),
    [
      lastActivity,
      lastActivityStyle,
      singleLineStyle,
      styles.itemContainer,
      uiName,
    ],
  );

  return sidebarItem;
}

const sidebarHeight = 30;
const unboundStyles = {
  itemContainer: {
    flexDirection: 'row',
    height: sidebarHeight,
    alignItems: 'center',
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
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
