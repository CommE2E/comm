// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { SidebarInfo } from 'lib/types/thread-types';
import { shortAbsoluteDate } from 'lib/utils/date-utils';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers';

import { SingleLine } from '../components/single-line.react';
import { useStyles } from '../themes/colors';

type Props = {
  +sidebarInfo: SidebarInfo,
};
function SidebarItem(props: Props): React.Node {
  const { lastUpdatedTime } = props.sidebarInfo;
  const lastActivity = shortAbsoluteDate(lastUpdatedTime);

  const { threadInfo } = props.sidebarInfo;
  const { uiName } = useResolvedThreadInfo(threadInfo);
  const styles = useStyles(unboundStyles);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;

  return (
    <View style={styles.itemContainer}>
      <SingleLine style={[styles.name, unreadStyle]}>{uiName}</SingleLine>
      <Text style={[styles.lastActivity, unreadStyle]}>{lastActivity}</Text>
    </View>
  );
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
