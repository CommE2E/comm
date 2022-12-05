// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import MaterialIcon from '@expo/vector-icons/MaterialCommunityIcons';

import useToggleUnreadStatus from 'lib/hooks/toggle-unread-status';
import type { ThreadInfo } from 'lib/types/thread-types';

import Swipeable from '../components/swipeable';
import { useColors } from '../themes/colors';
type Props = {
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId?: string,
  +iconSize: number,
  +children: React.Node,
};
function SwipeableThread(props: Props): React.Node {
  const swipeable = React.useRef();
  const navigation = useNavigation();
  React.useEffect(() => {
    return navigation.addListener('blur', () => {
      if (swipeable.current) {
        swipeable.current.close();
      }
    });
  }, [navigation, swipeable]);

  const { threadInfo, currentlyOpenedSwipeableId } = props;
  React.useEffect(() => {
    if (swipeable.current && threadInfo.id !== currentlyOpenedSwipeableId) {
      swipeable.current.close();
    }
  }, [currentlyOpenedSwipeableId, swipeable, threadInfo.id]);

  const { onSwipeableWillOpen } = props;
  const onSwipeableRightWillOpen = React.useCallback(() => {
    onSwipeableWillOpen(threadInfo);
  }, [onSwipeableWillOpen, threadInfo]);

  const colors = useColors();
  const { mostRecentNonLocalMessage, iconSize } = props;

  const swipeableClose = React.useCallback(() => {
    if (swipeable.current) {
      swipeable.current.close();
    }
  }, []);

  const toggleUnreadStatus = useToggleUnreadStatus(
    threadInfo,
    mostRecentNonLocalMessage,
    swipeableClose,
  );

  const swipeableActions = React.useMemo(() => {
    const isUnread = threadInfo.currentUser.unread;
    return [
      {
        key: 'action1',
        onPress: toggleUnreadStatus,
        color: isUnread ? colors.vibrantRedButton : colors.vibrantGreenButton,
        content: (
          <MaterialIcon
            name={isUnread ? 'email-open-outline' : 'email-mark-as-unread'}
            size={iconSize}
            color="white"
          />
        ),
      },
    ];
  }, [
    threadInfo.currentUser.unread,
    toggleUnreadStatus,
    colors.vibrantRedButton,
    colors.vibrantGreenButton,
    iconSize,
  ]);

  return (
    <Swipeable
      buttonWidth={60}
      innerRef={swipeable}
      onSwipeableRightWillOpen={onSwipeableRightWillOpen}
      rightActions={swipeableActions}
    >
      {props.children}
    </Swipeable>
  );
}

export default SwipeableThread;
