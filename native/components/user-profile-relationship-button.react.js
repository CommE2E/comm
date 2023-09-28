// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { UserInfo } from 'lib/types/user-types';

import RelationshipButton from './relationship-button.react.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

const onErrorCallback = () => {
  Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }]);
};

type Props = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
};

function UserProfileRelationshipButton(props: Props): React.Node {
  const { threadInfo, pendingPersonalThreadUserInfo } = props;

  const {
    otherUserInfo,
    callbacks: { friendUser, unfriendUser },
  } = useRelationshipPrompt(
    threadInfo,
    onErrorCallback,
    pendingPersonalThreadUserInfo,
  );

  const styles = useStyles(unboundStyles);

  const userProfileRelationshipButton = React.useMemo(() => {
    if (
      !otherUserInfo ||
      !otherUserInfo.username ||
      otherUserInfo.relationshipStatus === userRelationshipStatus.FRIEND
    ) {
      return null;
    }

    if (
      otherUserInfo.relationshipStatus ===
      userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return (
        <View style={styles.incomingFriendRequestContainer}>
          <Text style={styles.incomingFriendRequestLabel}>
            Incoming friend request
          </Text>
          <View style={styles.incomingFriendRequestButtonsContainer}>
            <View style={styles.acceptFriendRequestButtonContainer}>
              <RelationshipButton type="accept" onPress={friendUser} />
            </View>
            <View style={styles.rejectFriendRequestButtonContainer}>
              <RelationshipButton type="reject" onPress={unfriendUser} />
            </View>
          </View>
        </View>
      );
    }

    if (
      otherUserInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
    ) {
      return (
        <View style={styles.singleButtonContainer}>
          <RelationshipButton type="withdraw" onPress={unfriendUser} />
        </View>
      );
    }

    return (
      <View style={styles.singleButtonContainer}>
        <RelationshipButton type="add" onPress={friendUser} />
      </View>
    );
  }, [
    friendUser,
    otherUserInfo,
    styles.acceptFriendRequestButtonContainer,
    styles.incomingFriendRequestButtonsContainer,
    styles.incomingFriendRequestContainer,
    styles.incomingFriendRequestLabel,
    styles.rejectFriendRequestButtonContainer,
    styles.singleButtonContainer,
    unfriendUser,
  ]);

  return userProfileRelationshipButton;
}

const unboundStyles = {
  singleButtonContainer: {
    marginTop: 16,
  },
  incomingFriendRequestContainer: {
    marginTop: 24,
  },
  incomingFriendRequestLabel: {
    color: 'modalForegroundLabel',
  },
  incomingFriendRequestButtonsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  acceptFriendRequestButtonContainer: {
    flex: 1,
    marginRight: 4,
  },
  rejectFriendRequestButtonContainer: {
    flex: 1,
    marginLeft: 4,
  },
};

export default UserProfileRelationshipButton;
