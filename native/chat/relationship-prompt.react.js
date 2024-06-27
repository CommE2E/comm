// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { UserInfo } from 'lib/types/user-types.js';

import Button from '../components/button.react.js';
import { useStyles, useColors } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type ButtonContentContainerProps = {
  +children: React.Node,
  +isLoading: boolean,
};

function ButtonContentContainer(props: ButtonContentContainerProps) {
  const { children, isLoading } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const buttonContentContainerStyles = React.useMemo(() => {
    const result = [styles.buttonContentContainer];

    if (isLoading) {
      result.push(styles.buttonLoading);
    }

    return result;
  }, [isLoading, styles.buttonContentContainer, styles.buttonLoading]);

  const loadingSpinner = React.useMemo(
    () =>
      isLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.whiteText}
          style={styles.loadingSpinner}
        />
      ) : null,
    [colors.whiteText, isLoading, styles.loadingSpinner],
  );

  return (
    <>
      <View style={buttonContentContainerStyles}>{children}</View>
      {loadingSpinner}
    </>
  );
}

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
          <Button
            style={[styles.button, styles.redButton]}
            onPress={blockUser}
            disabled={isLoadingBlockUser}
          >
            <ButtonContentContainer isLoading={isLoadingBlockUser}>
              <Icon name="user-shield" size={12} color="white" />
              <Text style={styles.buttonText}>Block user</Text>
            </ButtonContentContainer>
          </Button>
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
          <Button
            style={[styles.button, styles.greenButton]}
            onPress={unblockUser}
            disabled={isLoadingUnblockUser}
          >
            <ButtonContentContainer isLoading={isLoadingUnblockUser}>
              <Icon name="user-shield" size={12} color="white" />
              <Text style={styles.buttonText}>Unblock user</Text>
            </ButtonContentContainer>
          </Button>
        </View>
      );
    }

    if (
      otherUserInfo.relationshipStatus ===
      userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return (
        <View style={styles.container}>
          <Button
            style={[styles.button, styles.greenButton]}
            onPress={friendUser}
            disabled={isLoadingFriendUser}
          >
            <ButtonContentContainer isLoading={isLoadingFriendUser}>
              <Icon name="user-plus" size={12} color="white" />
              <Text style={styles.buttonText}>Accept friend request</Text>
            </ButtonContentContainer>
          </Button>
          <Button
            style={[styles.button, styles.redButton]}
            onPress={unfriendUser}
            disabled={isLoadingUnfriendUser}
          >
            <ButtonContentContainer isLoading={isLoadingUnfriendUser}>
              <Icon name="user-slash" size={12} color="white" />
              <Text style={styles.buttonText}>Reject friend request</Text>
            </ButtonContentContainer>
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
            disabled={isLoadingUnfriendUser}
          >
            <ButtonContentContainer isLoading={isLoadingUnfriendUser}>
              <Icon name="user-minus" size={12} color="white" />
              <Text style={styles.buttonText}>Withdraw friend request</Text>
            </ButtonContentContainer>
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Button
          style={[styles.button, styles.greenButton]}
          onPress={friendUser}
          disabled={isLoadingFriendUser}
        >
          <ButtonContentContainer isLoading={isLoadingFriendUser}>
            <Icon name="user-plus" size={12} color="white" />
            <Text style={styles.buttonText}>Add friend</Text>
          </ButtonContentContainer>
        </Button>
        <Button
          style={[styles.button, styles.redButton]}
          onPress={blockUser}
          disabled={isLoadingBlockUser}
        >
          <ButtonContentContainer isLoading={isLoadingBlockUser}>
            <Icon name="user-shield" size={12} color="white" />
            <Text style={styles.buttonText}>Block user</Text>
          </ButtonContentContainer>
        </Button>
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
