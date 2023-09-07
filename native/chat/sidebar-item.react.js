// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { SidebarInfo } from 'lib/types/thread-types.js';
import { shortAbsoluteDate } from 'lib/utils/date-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import SingleLine from '../components/single-line.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +sidebarInfo: SidebarInfo,
};
function SidebarItem(props: Props): React.Node {
  const { lastUpdatedTime } = props.sidebarInfo;

  const lastActivity = React.useMemo(
    () => shortAbsoluteDate(lastUpdatedTime),
    [lastUpdatedTime],
  );

  const { threadInfo } = props.sidebarInfo;
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
