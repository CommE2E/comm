// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { UserInfo } from 'lib/types/user-types.js';

import RelationshipButton from '../components/relationship-button.react.js';
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
      loaders: {
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
          <View style={styles.buttonContainer}>
            <RelationshipButton
              type="block"
              onPress={blockUser}
              isLoading={isLoadingBlockUser}
              size="S"
            />
          </View>
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
          <View style={styles.buttonContainer}>
            <RelationshipButton
              type="unblock"
              onPress={unblockUser}
              isLoading={isLoadingUnblockUser}
              size="S"
            />
          </View>
        </View>
      );
    }

    if (
      otherUserInfo.relationshipStatus ===
      userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return (
        <View style={styles.container}>
          <View style={styles.buttonContainer}>
            <RelationshipButton
              type="accept"
              onPress={friendUser}
              isLoading={isLoadingFriendUser}
              size="S"
            />
          </View>
          <View style={styles.buttonContainer}>
            <RelationshipButton
              type="reject"
              onPress={unfriendUser}
              isLoading={isLoadingUnfriendUser}
              size="S"
            />
          </View>
        </View>
      );
    }

    if (
      otherUserInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
    ) {
      return (
        <View style={styles.container}>
          <View style={styles.buttonContainer}>
            <RelationshipButton
              type="withdraw"
              onPress={unfriendUser}
              isLoading={isLoadingUnfriendUser}
              size="S"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <RelationshipButton
            type="add"
            onPress={friendUser}
            isLoading={isLoadingFriendUser}
            size="S"
          />
        </View>
        <View style={styles.buttonContainer}>
          <RelationshipButton
            type="block"
            onPress={blockUser}
            isLoading={isLoadingBlockUser}
            size="S"
          />
        </View>
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
  buttonContainer: {
    flex: 1,
    height: 32,
    marginHorizontal: 5,
  },
};

export default RelationshipPrompt;
