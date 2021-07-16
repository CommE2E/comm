// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  setThreadUnreadStatus,
  setThreadUnreadStatusActionTypes,
} from 'lib/actions/activity-actions';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from 'lib/types/activity-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Swipeable from '../components/swipeable';
import { useColors } from '../themes/colors';

type Props = {|
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +currentlyOpenedSwipeableId?: string,
  +iconSize: number,
  +children: React.Node,
|};
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
  const updateUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload> = useServerCall(
    setThreadUnreadStatus,
  );
  const dispatchActionPromise = useDispatchActionPromise();
  const swipeableActions = React.useMemo(() => {
    const isUnread = threadInfo.currentUser.unread;
    const toggleUnreadStatus = () => {
      const request = {
        unread: !isUnread,
        threadID: threadInfo.id,
        latestMessage: mostRecentNonLocalMessage,
      };
      dispatchActionPromise(
        setThreadUnreadStatusActionTypes,
        updateUnreadStatus(request),
        undefined,
        {
          threadID: threadInfo.id,
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
    colors,
    threadInfo,
    mostRecentNonLocalMessage,
    iconSize,
    updateUnreadStatus,
    dispatchActionPromise,
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
