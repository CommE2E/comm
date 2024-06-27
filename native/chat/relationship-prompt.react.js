// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { Text, View } from 'react-native';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { UserInfo } from 'lib/types/user-types.js';

import LoadableButton from '../components/loadable-button.react.js';
import { useStyles } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type Props = {
  +pendingPersonalThreadUserInfo: ?UserInfo,
  +threadInfo: ThreadInfo,
};

const RelationshipPrompt: React.ComponentType<Props> = React.memo<Props>(
  function RelationshipPrompt({
    pendingPersonalThreadUserInfo,
    threadInfo,
  }: Props) {
    const onErrorCallback = React.useCallback(() => {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
        [{ text: 'OK' }],
      );
    }, []);
    const {
      otherUserInfo,
      callbacks: { blockUser, unblockUser, friendUser, unfriendUser },
      loadingState: {
        isLoadingBlockUser,
        isLoadingUnblockUser,
        isLoadingFriendUser,
        isLoadingUnfriendUser,
      },
    } = useRelationshipPrompt(
      threadInfo,
      onErrorCallback,
      pendingPersonalThreadUserInfo,
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
          <LoadableButton
            style={[styles.button, styles.redButton]}
            onPress={blockUser}
            isLoading={isLoadingBlockUser}
          >
            <Icon name="user-shield" size={12} color="white" />
            <Text style={styles.buttonText}>Block user</Text>
          </LoadableButton>
        </View>
      );
    }

    if (
      otherUserInfo.relationshipStatus ===
        userRelationshipStatus.BOTH_BLOCKED ||
      otherUserInfo.relationshipStatus ===
        userRelationshipStatus.BLOCKED_BY_VIEWER
    ) {
      return (
        <View style={styles.container}>
          <LoadableButton
            style={[styles.button, styles.greenButton]}
            onPress={unblockUser}
            isLoading={isLoadingUnblockUser}
          >
            <Icon name="user-shield" size={12} color="white" />
            <Text style={styles.buttonText}>Unblock user</Text>
          </LoadableButton>
        </View>
      );
    }

    if (
      otherUserInfo.relationshipStatus ===
      userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return (
        <View style={styles.container}>
          <LoadableButton
            style={[styles.button, styles.greenButton]}
            onPress={friendUser}
            isLoading={isLoadingFriendUser}
          >
            <Icon name="user-plus" size={12} color="white" />
            <Text style={styles.buttonText}>Accept friend request</Text>
          </LoadableButton>
          <LoadableButton
            style={[styles.button, styles.redButton]}
            onPress={unfriendUser}
            isLoading={isLoadingUnfriendUser}
          >
            <Icon name="user-slash" size={12} color="white" />
            <Text style={styles.buttonText}>Reject friend request</Text>
          </LoadableButton>
        </View>
      );
    }

    if (
      otherUserInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
    ) {
      return (
        <View style={styles.container}>
          <LoadableButton
            style={[styles.button, styles.redButton]}
            onPress={unfriendUser}
            isLoading={isLoadingUnfriendUser}
          >
            <Icon name="user-minus" size={12} color="white" />
            <Text style={styles.buttonText}>Withdraw friend request</Text>
          </LoadableButton>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <LoadableButton
          style={[styles.button, styles.greenButton]}
          onPress={friendUser}
          isLoading={isLoadingFriendUser}
        >
          <Icon name="user-plus" size={12} color="white" />
          <Text style={styles.buttonText}>Add friend</Text>
        </LoadableButton>
        <LoadableButton
          style={[styles.button, styles.redButton]}
          onPress={blockUser}
          isLoading={isLoadingBlockUser}
        >
          <Icon name="user-shield" size={12} color="white" />
          <Text style={styles.buttonText}>Block user</Text>
        </LoadableButton>
      </View>
    );
  },
);

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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  greenButton: {
    backgroundColor: 'vibrantGreenButton',
  },
  redButton: {
    backgroundColor: 'vibrantRedButton',
  },
  buttonContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonLoading: {
    opacity: 0,
  },
  buttonText: {
    fontSize: 11,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 5,
  },
  loadingSpinner: {
    position: 'absolute',
  },
};

export default RelationshipPrompt;
