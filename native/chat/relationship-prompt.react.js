// @flow

import type { RelationshipAction } from 'lib/types/relationship-types';
import {
  relationshipActions,
  userRelationshipStatus,
} from 'lib/types/relationship-types';
import type { UserInfo } from 'lib/types/user-types';
import type { ThreadInfo } from 'lib/types/thread-types';

import * as React from 'react';
import { Alert, Text, View } from 'react-native';
import invariant from 'invariant';

import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions';

import Button from '../components/button.react';
import { useStyles } from '../themes/colors';
import { useSelector } from '../redux/redux-utils';

type Props = {|
  +pendingPersonalThreadUserInfo: ?UserInfo,
  +threadInfo: ThreadInfo,
|};

export default React.memo<Props>(function RelationshipPrompt({
  pendingPersonalThreadUserInfo,
  threadInfo,
}: Props) {
  // We're fetching the info from state because we need the most recent
  // relationship status. Additionally, member info does not contain info
  // about relationship.
  const otherUserInfo = useSelector((state) => {
    const currentUserID = state.currentUserInfo?.id;
    const otherUserID =
      threadInfo.members
        .map((member) => member.id)
        .find((id) => id !== currentUserID) ??
      pendingPersonalThreadUserInfo?.id;

    const { userInfos } = state.userStore;
    return otherUserID && userInfos[otherUserID]
      ? userInfos[otherUserID]
      : pendingPersonalThreadUserInfo;
  });

  const callUpdateRelationships = useServerCall(serverUpdateRelationships);
  const updateRelationship = React.useCallback(
    async (action: RelationshipAction) => {
      try {
        invariant(otherUserInfo, 'Other user info should be present');
        return await callUpdateRelationships({
          action,
          userIDs: [otherUserInfo.id],
        });
      } catch (e) {
        Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }]);
        throw e;
      }
    },
    [callUpdateRelationships, otherUserInfo],
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const onButtonPress = React.useCallback(
    (action: RelationshipAction) => {
      invariant(
        otherUserInfo,
        'User info should be present when a button is clicked',
      );
      dispatchActionPromise(
        updateRelationshipsActionTypes,
        updateRelationship(action),
      );
    },
    [dispatchActionPromise, otherUserInfo, updateRelationship],
  );

  const blockUser = React.useCallback(
    () => onButtonPress(relationshipActions.BLOCK),
    [onButtonPress],
  );
  const unblockUser = React.useCallback(
    () => onButtonPress(relationshipActions.UNBLOCK),
    [onButtonPress],
  );
  const friendUser = React.useCallback(
    () => onButtonPress(relationshipActions.FRIEND),
    [onButtonPress],
  );
  const unfriendUser = React.useCallback(
    () => onButtonPress(relationshipActions.UNFRIEND),
    [onButtonPress],
  );

  const styles = useStyles(unboundStyles);

  if (
    !otherUserInfo ||
    !otherUserInfo.username ||
    otherUserInfo.relationshipStatus === userRelationshipStatus.FRIEND
  ) {
    return null;
  }

  if (
    otherUserInfo.relationshipStatus === userRelationshipStatus.BLOCKED_VIEWER
  ) {
    return (
      <View style={styles.container}>
        <Button style={[styles.button, styles.redButton]} onPress={blockUser}>
          <Text style={styles.buttonText}>Block User</Text>
        </Button>
      </View>
    );
  }

  if (
    otherUserInfo.relationshipStatus === userRelationshipStatus.BOTH_BLOCKED ||
    otherUserInfo.relationshipStatus ===
      userRelationshipStatus.BLOCKED_BY_VIEWER
  ) {
    return (
      <View style={styles.container}>
        <Button
          style={[styles.button, styles.greenButton]}
          onPress={unblockUser}
        >
          <Text style={styles.buttonText}>Unblock User</Text>
        </Button>
      </View>
    );
  }

  if (
    otherUserInfo.relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED
  ) {
    return (
      <View style={styles.container}>
        <Button
          style={[styles.button, styles.greenButton]}
          onPress={friendUser}
        >
          <Text style={styles.buttonText}>Accept Friend Request</Text>
        </Button>
        <Button
          style={[styles.button, styles.redButton]}
          onPress={unfriendUser}
        >
          <Text style={styles.buttonText}>Reject Friend Request</Text>
        </Button>
      </View>
    );
  }

  if (
    otherUserInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
  ) {
    return (
      <View style={styles.container}>
        <Button
          style={[styles.button, styles.redButton]}
          onPress={unfriendUser}
        >
          <Text style={styles.buttonText}>Withdraw Friend Request</Text>
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button style={[styles.button, styles.greenButton]} onPress={friendUser}>
        <Text style={styles.buttonText}>Add Friend</Text>
      </Button>
      <Button style={[styles.button, styles.redButton]} onPress={blockUser}>
        <Text style={styles.buttonText}>Block User</Text>
      </Button>
    </View>
  );
});

const unboundStyles = {
  container: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: 'panelBackground',
    flexDirection: 'row',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
  },
  greenButton: {
    backgroundColor: 'greenButton',
  },
  redButton: {
    backgroundColor: 'redButton',
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
  },
};
