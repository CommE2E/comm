// @flow

import * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import {
  leaveThreadActionTypes,
  useLeaveThread,
} from 'lib/actions/thread-actions.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useJoinCommunity } from 'lib/shared/community-utils.js';
import {
  getCommunity,
  useThreadHasPermission,
  useViewerIsMember,
} from 'lib/shared/thread-utils.js';
import type {
  JoinCommunityStep,
  OngoingJoinCommunityData,
} from 'lib/types/community-types';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import PrimaryButton from './primary-button.react.js';
import SingleLine from './single-line.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import { nonThreadCalendarQuery } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { TextStyle, ViewStyle } from '../types/styles.js';

type Props = {
  +threadInfo: ThreadInfo,
  +style?: ViewStyle,
  +textStyle?: TextStyle,
};

function CommunityListItem(props: Props): React.Node {
  const { threadInfo: initialThreadInfo, style, textStyle } = props;

  // initialThreadInfo will not update if the user leaves or joins the thread,
  // so we also need reduxThreadInfo to track thread membership and permissions
  const reduxThreadInfo: ?ThreadInfo = useSelector(
    state => threadInfoSelector(state)[initialThreadInfo.id],
  );

  const [threadInfo, setThreadInfo] = React.useState(initialThreadInfo);

  React.useEffect(() => {
    if (reduxThreadInfo) {
      setThreadInfo(reduxThreadInfo);
    } else {
      setThreadInfo(initialThreadInfo);
    }
  }, [initialThreadInfo, reduxThreadInfo]);

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

  const isMember = useViewerIsMember(threadInfo);
  const [joinStatus, setJoinStatus] = useState<
    'joined' | 'notJoined' | 'joining' | 'leaving',
  >(`notJoined`);
  React.useEffect(() => {
    setJoinStatus(isMember ? 'joined' : 'notJoined');
  }, [isMember]);

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
    threadInfo,
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
    buttonContent = (
      <PrimaryButton
        label="Leave"
        variant="disabled"
        style={styles.primaryButton}
        textStyle={styles.buttonText}
        onPress={() => {}}
      />
    );
  } else if (joinStatus === 'joining' || joinStatus === 'leaving') {
    buttonContent = (
      <PrimaryButton
        variant="loading"
        style={styles.primaryButton}
        textStyle={styles.buttonText}
        onPress={() => {}}
      />
    );
  } else if (joinStatus === 'joined') {
    buttonContent = (
      <PrimaryButton
        onPress={handleLeave}
        label="Leave"
        variant="enabled"
        style={[styles.primaryButton, styles.primaryButtonToggled]}
        textStyle={[styles.buttonText, styles.buttonTextToggled]}
      />
    );
  } else {
    buttonContent = (
      <PrimaryButton
        onPress={handleJoin}
        label="Join"
        variant="enabled"
        style={styles.primaryButton}
        textStyle={styles.buttonText}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ThreadAvatar size="S" threadInfo={resolvedThreadInfo} />
      <SingleLine style={[styles.text, textStyle]}>
        {resolvedThreadInfo.uiName}
      </SingleLine>
      {buttonContent}
    </View>
  );
}

const MemoizedCommunityListItem: React.ComponentType<Props> =
  React.memo<Props>(CommunityListItem);

const unboundStyles = {
  activityIndicatorContainer: {
    marginLeft: 10,
  },
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
  primaryButton: {
    marginLeft: 'auto',
    height: 24,
    minWidth: 70,
  },
  primaryButtonToggled: {
    backgroundColor: 'primaryButton',
    borderColor: 'primaryButton',
  },
  buttonText: {
    fontSize: 14,
    padding: 2,
  },
  buttonTextToggled: {
    color: 'primaryButtonText',
  },
};

export default MemoizedCommunityListItem;
