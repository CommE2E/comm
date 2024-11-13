// @flow

import * as React from 'react';
import { useState } from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';

import {
  leaveThreadActionTypes,
  useLeaveThread,
} from 'lib/actions/thread-actions.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useJoinCommunity } from 'lib/shared/community-utils.js';
import {
  getCommunity,
  useThreadHasPermission,
  viewerIsMember,
} from 'lib/shared/thread-utils.js';
import type {
  JoinCommunityStep,
  OngoingJoinCommunityData,
} from 'lib/types/community-types';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import SingleLine from './single-line.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import { nonThreadCalendarQuery } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { TextStyle, ViewStyle } from '../types/styles.js';

const unboundStyles = {
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  text: {
    color: 'modalForegroundLabel',
    fontSize: 16,
    paddingLeft: 9,
    paddingRight: 12,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
    width: 50,
    justifyContent: 'flex-start',
  },
  joinButton: {
    color: 'link',
    fontSize: 16,
    paddingLeft: 6,
  },
  leaveButton: {
    color: 'redText',
    fontSize: 16,
    paddingLeft: 6,
  },
};

type Props = {
  +threadInfo: ThreadInfo,
  +style?: ViewStyle,
  +textStyle?: TextStyle,
};

function CommunityListItem(props: Props): React.Node {
  const { threadInfo, style, textStyle } = props;

  const reduxThreadInfo: ?ThreadInfo = useSelector(
    state => threadInfoSelector(state)[threadInfo.id],
  );

  const navContext = React.useContext(NavContext);
  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );
  const communityID = getCommunity(threadInfo);
  const [ongoingJoinData, setOngoingJoinData] =
    React.useState<?OngoingJoinCommunityData>(null);
  const [step, setStep] = React.useState<JoinCommunityStep>('inactive');

  const isMember = viewerIsMember(reduxThreadInfo);
  const initialJoinStatus = isMember ? 'joined' : 'notJoined';
  const [joinStatus, setJoinStatus] = useState<
    'joined' | 'notJoined' | 'joining' | 'leaving',
  >(initialJoinStatus);
  const joinCommunity = useJoinCommunity({
    communityID,
    keyserverOverride: null,
    calendarQuery,
    ongoingJoinData,
    setOngoingJoinData,
    step,
    setStep,
  });

  const canLeaveThread = useThreadHasPermission(
    reduxThreadInfo,
    threadPermissions.LEAVE_THREAD,
  );

  const styles = useStyles(unboundStyles);
  const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);

  const handleJoin = React.useCallback(async () => {
    setJoinStatus('joining');
    try {
      await joinCommunity();
      setJoinStatus('joined');
    } catch (error) {
      console.error('Failed to join community:', error);
      setJoinStatus('notJoined');
    }
  }, [joinCommunity]);

  const dispatchActionPromise = useDispatchActionPromise();
  const callLeaveThread = useLeaveThread();

  const handleLeave = React.useCallback(async () => {
    setJoinStatus('leaving');
    try {
      const leavePromise = callLeaveThread({ threadID: threadInfo.id });
      void dispatchActionPromise(leaveThreadActionTypes, leavePromise);
      await leavePromise;
      setJoinStatus('notJoined');
    } catch (error) {
      console.error('Failed to leave community:', error);
      setJoinStatus('joined');
    }
  }, [callLeaveThread, dispatchActionPromise, threadInfo.id]);

  let buttonContent;
  if (joinStatus === 'joined' && !canLeaveThread) {
    buttonContent = null;
  } else if (joinStatus === 'joining') {
    buttonContent = <ActivityIndicator size="small" color="white" />;
  } else if (joinStatus === 'leaving') {
    buttonContent = <ActivityIndicator size="small" color="red" />;
  } else if (joinStatus === 'joined') {
    buttonContent = (
      <TouchableOpacity onPress={handleLeave}>
        <Text style={styles.leaveButton}>Leave</Text>
      </TouchableOpacity>
    );
  } else {
    buttonContent = (
      <TouchableOpacity onPress={handleJoin}>
        <Text style={styles.joinButton}>Join</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ThreadAvatar size="S" threadInfo={resolvedThreadInfo} />
      <SingleLine style={[styles.text, textStyle]}>
        {resolvedThreadInfo.uiName}
      </SingleLine>
      <View style={styles.buttonContainer}>{buttonContent}</View>
    </View>
  );
}

const MemoizedCommunityListItem: React.ComponentType<Props> =
  React.memo<Props>(CommunityListItem);

export default MemoizedCommunityListItem;
