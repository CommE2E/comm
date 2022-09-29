// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ThreadInfo, SidebarInfo } from 'lib/types/thread-types';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import Button from '../components/button.react';
import { SingleLine } from '../components/single-line.react';
import { useColors, useStyles } from '../themes/colors';
import type { ViewStyle } from '../types/styles';

type Props = {
  +sidebarInfo: SidebarInfo,
  +onPressItem: (threadInfo: ThreadInfo) => void,
  +style?: ?ViewStyle,
};
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

  const sidebarStyle = React.useMemo(() => {
    return [styles.sidebar, props.style];
  }, [props.style, styles.sidebar]);

  return (
    <Button
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
      iosActiveOpacity={0.85}
      style={sidebarStyle}
      onPress={onPress}
    >
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
    paddingLeft: 6,
    paddingRight: 18,
    alignItems: 'center',
    backgroundColor: 'listBackground',
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
