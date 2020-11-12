// @flow

import {
  type ChatThreadItem,
  chatThreadItemPropType,
} from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from 'lib/types/activity-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import {
  setThreadUnreadStatus,
  setThreadUnreadStatusActionTypes,
} from 'lib/actions/activity-actions';

import * as React from 'react';
import { Text, View } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Swipeable from '../components/swipeable';
import { useNavigation } from '@react-navigation/native';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import Button from '../components/button.react';
import MessagePreview from './message-preview.react';
import ColorSplotch from '../components/color-splotch.react';
import { useColors, useStyles } from '../themes/colors';
import { SingleLine } from '../components/single-line.react';
import { useMemo } from 'react';
import ChatThreadListSidebar from './chat-thread-list-sidebar.react';
import ChatThreadListSeeMoreSidebars from './chat-thread-list-see-more-sidebars.react';

type Props = {|
  +data: ChatThreadItem,
  +onPressItem: (threadInfo: ThreadInfo) => void,
  +onPressSeeMoreSidebars: (threadInfo: ThreadInfo) => void,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId?: string,
|};
function ChatThreadListItem({
  data,
  onPressItem,
  onPressSeeMoreSidebars,
  onSwipeableWillOpen,
  currentlyOpenedSwipeableId,
}: Props) {
  const swipeable = React.useRef<?Swipeable>();
  const navigation = useNavigation();
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const updateUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload> = useServerCall(
    setThreadUnreadStatus,
  );
  const dispatchActionPromise = useDispatchActionPromise();

  React.useEffect(() => {
    return navigation.addListener('blur', () => {
      if (swipeable.current) {
        swipeable.current.close();
      }
    });
  }, [navigation, swipeable]);

  React.useEffect(() => {
    if (
      swipeable.current &&
      data.threadInfo.id !== currentlyOpenedSwipeableId
    ) {
      swipeable.current.close();
    }
  }, [currentlyOpenedSwipeableId, swipeable, data.threadInfo.id]);

  const lastMessage = React.useMemo(() => {
    const mostRecentMessageInfo = data.mostRecentMessageInfo;
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
        threadInfo={data.threadInfo}
      />
    );
  }, [data.mostRecentMessageInfo, data.threadInfo, styles]);

  const sidebars = data.sidebars.map((sidebarItem) => {
    if (sidebarItem.type === 'sidebar') {
      return (
        <ChatThreadListSidebar
          threadInfo={sidebarItem.threadInfo}
          lastUpdatedTime={sidebarItem.lastUpdatedTime}
          onPressItem={onPressItem}
          key={sidebarItem.threadInfo.id}
        />
      );
    } else {
      return (
        <ChatThreadListSeeMoreSidebars
          threadInfo={data.threadInfo}
          unread={sidebarItem.unread}
          onPress={onPressSeeMoreSidebars}
          key="seeMore"
        />
      );
    }
  });

  const onPress = React.useCallback(() => {
    onPressItem(data.threadInfo);
  }, [onPressItem, data.threadInfo]);

  const onSwipeableRightWillOpen = React.useCallback(() => {
    onSwipeableWillOpen(data.threadInfo);
  }, [onSwipeableWillOpen, data.threadInfo]);

  const lastActivity = shortAbsoluteDate(data.lastUpdatedTime);
  const unreadStyle = data.threadInfo.currentUser.unread ? styles.unread : null;

  const swipeableActions = useMemo(() => {
    const isUnread = data.threadInfo.currentUser.unread;
    const toggleUnreadStatus = () => {
      const request = {
        unread: !isUnread,
        threadID: data.threadInfo.id,
        latestMessage: data.mostRecentNonLocalMessage,
      };
      dispatchActionPromise(
        setThreadUnreadStatusActionTypes,
        updateUnreadStatus(request),
        undefined,
        {
          threadID: data.threadInfo.id,
          unread: !isUnread,
        },
      );
      if (swipeable.current) {
        swipeable.current.close();
      }
    };
    return [
      {
        key: 'action1',
        onPress: toggleUnreadStatus,
        color: isUnread ? colors.redButton : colors.greenButton,
        content: (
          <MaterialIcon
            name={isUnread ? 'email-open-outline' : 'email-mark-as-unread'}
            size={24}
          />
        ),
      },
    ];
  }, [
    colors,
    data.threadInfo,
    data.mostRecentNonLocalMessage,
    updateUnreadStatus,
    dispatchActionPromise,
  ]);

  return (
    <>
      <Swipeable
        buttonWidth={60}
        innerRef={swipeable}
        onSwipeableRightWillOpen={onSwipeableRightWillOpen}
        rightActions={swipeableActions}
      >
        <Button
          onPress={onPress}
          iosFormat="highlight"
          iosHighlightUnderlayColor={colors.listIosHighlightUnderlay}
          iosActiveOpacity={0.85}
        >
          <View style={styles.container}>
            <View style={styles.row}>
              <SingleLine style={[styles.threadName, unreadStyle]}>
                {data.threadInfo.uiName}
              </SingleLine>
              <View style={styles.colorSplotch}>
                <ColorSplotch color={data.threadInfo.color} size="small" />
              </View>
            </View>
            <View style={styles.row}>
              {lastMessage}
              <Text style={[styles.lastActivity, unreadStyle]}>
                {lastActivity}
              </Text>
            </View>
          </View>
        </Button>
      </Swipeable>
      {sidebars}
    </>
  );
}

const unboundStyles = {
  colorSplotch: {
    marginLeft: 10,
    marginTop: 2,
  },
  container: {
    height: 60,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    backgroundColor: 'listBackground',
  },
  lastActivity: {
    color: 'listForegroundTertiaryLabel',
    fontSize: 16,
    marginLeft: 10,
  },
  noMessages: {
    color: 'listForegroundTertiaryLabel',
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
    paddingLeft: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threadName: {
    color: 'listForegroundSecondaryLabel',
    flex: 1,
    fontSize: 20,
    paddingLeft: 10,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
};

ChatThreadListItem.propTypes = {
  data: chatThreadItemPropType.isRequired,
  onPressItem: PropTypes.func.isRequired,
  onSwipeableWillOpen: PropTypes.func.isRequired,
  currentlyOpenedSwipeableId: PropTypes.string,
};

export default ChatThreadListItem;
