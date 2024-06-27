// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import type { SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { UserInfo } from 'lib/types/user-types';

import { userProfileActionButtonHeight } from './user-profile-constants.js';
import RelationshipButton from '../components/relationship-button.react.js';
import { useStyles } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

const onErrorCallback = () => {
  Alert.alert(
    unknownErrorAlertDetails.title,
    unknownErrorAlertDetails.message,
    [{ text: 'OK' }],
  );
};

type Props = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
  +setUserProfileRelationshipButtonHeight: SetState<number>,
};

function UserProfileRelationshipButton(props: Props): React.Node {
  const {
    threadInfo,
    pendingPersonalThreadUserInfo,
    setUserProfileRelationshipButtonHeight,
  } = props;

  const {
    otherUserInfo,
    callbacks: { friendUser, unfriendUser },
    loaders: { isLoadingFriendUser, isLoadingUnfriendUser },
  } = useRelationshipPrompt(
    threadInfo,
    onErrorCallback,
    pendingPersonalThreadUserInfo,
  );

  React.useLayoutEffect(() => {
    if (
      !otherUserInfo ||
      otherUserInfo.relationshipStatus === userRelationshipStatus.FRIEND
    ) {
      setUserProfileRelationshipButtonHeight(0);
    } else if (
      otherUserInfo?.relationshipStatus ===
      userRelationshipStatus.REQUEST_RECEIVED
    ) {
      const incomingFriendRequestButtonsContainerHeight = 88;

      setUserProfileRelationshipButtonHeight(
        incomingFriendRequestButtonsContainerHeight,
      );
    } else {
      setUserProfileRelationshipButtonHeight(userProfileActionButtonHeight);
    }
  }, [
    otherUserInfo,
    otherUserInfo?.relationshipStatus,
    setUserProfileRelationshipButtonHeight,
  ]);

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
              <RelationshipButton
                type="accept"
                onPress={friendUser}
                isLoading={isLoadingFriendUser}
                size="S"
              />
            </View>
            <View style={styles.rejectFriendRequestButtonContainer}>
              <RelationshipButton
                type="reject"
                onPress={unfriendUser}
                isLoading={isLoadingUnfriendUser}
                size="S"
              />
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
          <RelationshipButton
            type="withdraw"
            onPress={unfriendUser}
            isLoading={isLoadingUnfriendUser}
          />
        </View>
      );
    }

    return (
      <View style={styles.singleButtonContainer}>
        <RelationshipButton
          type="add"
          onPress={friendUser}
          isLoading={isLoadingFriendUser}
        />
      </View>
    );
  }, [
    friendUser,
    isLoadingFriendUser,
    isLoadingUnfriendUser,
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
    height: 38,
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
    height: 32,
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
