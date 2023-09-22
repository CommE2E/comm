// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { View, Text } from 'react-native';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { UserInfo } from 'lib/types/user-types';

import Button from '../components/button.react.js';
import { useStyles, useColors } from '../themes/colors.js';
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

  const showNothing =
    !otherUserInfo ||
    !otherUserInfo.username ||
    otherUserInfo.relationshipStatus === userRelationshipStatus.FRIEND;

  const showIncomingFriendRequestButtons =
    otherUserInfo?.relationshipStatus ===
    userRelationshipStatus.REQUEST_RECEIVED;

  const showWithdrawFriendRequestButton =
    otherUserInfo?.relationshipStatus === userRelationshipStatus.REQUEST_SENT;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const acceptFriendRequestButtonStyle = React.useMemo(
    () => [
      styles.buttonContainer,
      styles.greenButton,
      styles.incomingFriendRequestButton,
    ],
    [
      styles.buttonContainer,
      styles.greenButton,
      styles.incomingFriendRequestButton,
    ],
  );

  const rejectFriendRequestButtonStyle = React.useMemo(
    () => [
      styles.buttonContainer,
      styles.redButton,
      styles.incomingFriendRequestButton,
    ],
    [
      styles.buttonContainer,
      styles.incomingFriendRequestButton,
      styles.redButton,
    ],
  );

  const withdrawFriendRequestButtonStyle = React.useMemo(
    () => [styles.buttonContainer, styles.redButton],
    [styles.buttonContainer, styles.redButton],
  );

  const addFriendButtonStyle = React.useMemo(
    () => [styles.buttonContainer, styles.greenButton],
    [styles.buttonContainer, styles.greenButton],
  );

  if (showNothing) {
    return null;
  }

  if (showIncomingFriendRequestButtons) {
    return (
      <View style={styles.incomingFriendRequestContainer}>
        <Text style={styles.incomingFriendRequestLabel}>
          Incoming friend request
        </Text>
        <View style={styles.incomingFriendRequestButtonsContainer}>
          <Button style={acceptFriendRequestButtonStyle} onPress={friendUser}>
            <Icon
              name="user-plus"
              size={22}
              color={colors.floatingButtonLabel}
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Accept</Text>
          </Button>
          <View style={styles.incomingFriendRequestButtonGap} />
          <Button style={rejectFriendRequestButtonStyle} onPress={unfriendUser}>
            <Icon
              name="user-minus"
              size={22}
              color={colors.floatingButtonLabel}
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Reject</Text>
          </Button>
        </View>
      </View>
    );
  }

  if (showWithdrawFriendRequestButton) {
    return (
      <Button style={withdrawFriendRequestButtonStyle} onPress={unfriendUser}>
        <Icon
          name="user-minus"
          size={22}
          color={colors.floatingButtonLabel}
          style={styles.buttonIcon}
        />
        <Text style={styles.buttonText}>Withdraw Friend Request</Text>
      </Button>
    );
  }

  return (
    <Button style={addFriendButtonStyle} onPress={friendUser}>
      <Icon
        name="user-plus"
        size={22}
        color={colors.floatingButtonLabel}
        style={styles.buttonIcon}
      />
      <Text style={styles.buttonText}>Add Friend</Text>
    </Button>
  );
}

const unboundStyles = {
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 16,
    borderRadius: 8,
  },
  buttonIcon: {
    paddingRight: 8,
  },
  buttonText: {
    color: 'floatingButtonLabel',
  },
  redButton: {
    backgroundColor: 'vibrantRedButton',
  },
  greenButton: {
    backgroundColor: 'vibrantGreenButton',
  },
  incomingFriendRequestContainer: {
    marginTop: 24,
  },
  incomingFriendRequestLabel: {
    color: 'modalForegroundLabel',
  },
  incomingFriendRequestButtonsContainer: {
    flexDirection: 'row',
  },
  incomingFriendRequestButton: {
    marginTop: 8,
    flex: 1,
  },
  incomingFriendRequestButtonGap: {
    width: 8,
  },
};

export default UserProfileRelationshipButton;
