// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { ChatThreadItem } from 'lib/selectors/chat-selectors';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { SingleLine } from '../components/single-line.react';
import SWMansionIcon from '../components/swmansion-icon.react';
import { useStyles } from '../themes/colors';
import MessagePreview from './message-preview.react';

type Props = {
  +subchannelInfo: ChatThreadItem,
};
function SubchannelItem(props: Props): React.Node {
  const {
    lastUpdatedTime,
    threadInfo,
    mostRecentMessageInfo,
  } = props.subchannelInfo;

  const lastActivity = shortAbsoluteDate(lastUpdatedTime);

  const styles = useStyles(unboundStyles);
  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;

  const lastMessage = React.useMemo(() => {
    if (!mostRecentMessageInfo) {
      return (
        <Text style={styles.noMessages} numberOfLines={1}>
          No messages
        </Text>
      );
    }
    return (
      <MessagePreview
        messageInfo={mostRecentMessageInfo}
        threadInfo={threadInfo}
      />
    );
  }, [mostRecentMessageInfo, threadInfo, styles]);

  return (
    <View style={styles.outerView}>
      <View style={styles.itemRowContainer}>
        <View style={styles.iconWrapper}>
          <SWMansionIcon
            name="message-square"
            style={[styles.icon, unreadStyle]}
          />
        </View>
        <SingleLine style={[styles.name, unreadStyle]}>
          {threadInfo.uiName}
        </SingleLine>
      </View>
      <View style={styles.itemRowContainer}>
        {lastMessage}
        <Text style={[styles.lastActivity, unreadStyle]}>{lastActivity}</Text>
      </View>
    </View>
  );
}

const unboundStyles = {
  outerView: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    height: 60,
  },
  itemRowContainer: {
    flexDirection: 'row',
    height: 24,
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
  iconWrapper: {
    marginRight: 8,
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    color: 'listForegroundSecondaryLabel',
    alignItems: 'center',
    height: 24,
  },
  noMessages: {
    color: 'listForegroundTertiaryLabel',
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
  },
};

export default SubchannelItem;
