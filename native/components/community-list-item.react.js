// @flow

import * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { useLeaveThread } from 'lib/hooks/thread-hooks.js';
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

import PrimaryButton from './primary-button.react.js';
import SingleLine from './single-line.react.js';
import ThreadAvatar from '../avatars/thread-avatar.react.js';
import { nonThreadCalendarQuery } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

type Props = {
  +threadInfo: ThreadInfo,
  +style: ViewStyle,
  +farcasterChannelID?: ?string,
};

function CommunityListItem(props: Props): React.Node {
  const { threadInfo: initialThreadInfo, style, farcasterChannelID } = props;

  // `initialThreadInfo` will not update if the user leaves or joins the thread,
  // so we also need `reduxThreadInfo` to track thread membership and
  // permissions
  const reduxThreadInfo: ?ThreadInfo = useSelector(
    state => threadInfoSelector(state)[initialThreadInfo.id],
  );

  const threadInfo = reduxThreadInfo ?? initialThreadInfo;

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

  const joinCommunity = useJoinCommunity({
    communityID,
    keyserverOverride: null,
    calendarQuery,
    ongoingJoinData,
    setOngoingJoinData,
    step,
    setStep,
  });

  // We use `reduxThreadInfo` here because `initialThreadInfo` will not have
  // the correct thread permissions. If the thread is not in redux, the value
  // of `canLeaveThread` is false
  const canLeaveThread = useThreadHasPermission(
    reduxThreadInfo,
    threadPermissions.LEAVE_THREAD,
  );

  const styles = useStyles(unboundStyles);

  // We use `reduxThreadInfo` here because `initialThreadInfo` will not have
  // the correct membership status. If the thread is not in redux, the value
  // of `isMember` is false
  const isMember = viewerIsMember(reduxThreadInfo);
  const [joinStatus, setJoinStatus] = useState<
    'joined' | 'notJoined' | 'joining' | 'leaving',
  >(`notJoined`);
  React.useEffect(() => {
    setJoinStatus(isMember ? 'joined' : 'notJoined');
  }, [isMember]);

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

  const leaveThread = useLeaveThread();

  const handleLeave = React.useCallback(async () => {
    setJoinStatus('leaving');
    try {
      await leaveThread({ threadInfo });
      setJoinStatus('notJoined');
    } catch (error) {
      console.error('Failed to leave community:', error);
      setJoinStatus('joined');
    }
  }, [leaveThread, threadInfo]);

  const leaveButtonStyle = React.useMemo(
    () => [styles.primaryButton, styles.primaryButtonToggled],
    [styles.primaryButton, styles.primaryButtonToggled],
  );

  const leaveButtonTextStyle = React.useMemo(
    () => [styles.buttonText, styles.buttonTextToggled],
    [styles.buttonText, styles.buttonTextToggled],
  );

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
        style={leaveButtonStyle}
        textStyle={leaveButtonTextStyle}
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

  const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);

  const containerStyle = React.useMemo(
    () => [styles.container, style],
    [style, styles.container],
  );

  const singleLineTextStyle = React.useMemo(() => [styles.text], [styles.text]);

  return (
    <View style={containerStyle}>
      <ThreadAvatar
        size="S"
        threadInfo={resolvedThreadInfo}
        farcasterChannelID={farcasterChannelID}
      />
      <SingleLine style={singleLineTextStyle}>
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
    backgroundColor: 'primaryButtonToggled',
    borderColor: 'primaryButtonToggled',
  },
  buttonText: {
    fontSize: 14,
    padding: 4,
  },
  buttonTextToggled: {
    color: 'primaryButtonText',
  },
};

export default MemoizedCommunityListItem;
