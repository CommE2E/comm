// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Alert, Text, View } from 'react-native';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions';
import { getSingleOtherUser } from 'lib/shared/thread-utils';
import {
  type RelationshipAction,
  type RelationshipButton,
  relationshipButtons,
  relationshipActions,
} from 'lib/types/relationship-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react';
import { useSelector } from '../../redux/redux-utils';
import { useStyles, useColors } from '../../themes/colors';
import type { ViewStyle } from '../../types/styles';

type Props = {|
  +threadInfo: ThreadInfo,
  +buttonStyle: ViewStyle,
  +relationshipButton: RelationshipButton,
|};

export default React.memo<Props>(function ThreadSettingsEditRelationship(
  props: Props,
) {
  const otherUserInfo = useSelector(state => {
    const currentUserID = state.currentUserInfo?.id;
    const otherUserID = getSingleOtherUser(props.threadInfo, currentUserID);
    invariant(otherUserID, 'Other user should be specified');

    const { userInfos } = state.userStore;
    return userInfos[otherUserID];
  });
  invariant(otherUserInfo, 'Other user info should be specified');

  const callUpdateRelationships = useServerCall(serverUpdateRelationships);
  const updateRelationship = React.useCallback(
    async (action: RelationshipAction) => {
      try {
        return await callUpdateRelationships({
          action,
          userIDs: [otherUserInfo.id],
        });
      } catch (e) {
        Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
          cancelable: true,
        });
        throw e;
      }
    },
    [callUpdateRelationships, otherUserInfo],
  );

  const { relationshipButton } = props;
  const relationshipAction = React.useMemo(() => {
    if (relationshipButton === relationshipButtons.BLOCK) {
      return relationshipActions.BLOCK;
    } else if (
      relationshipButton === relationshipButtons.FRIEND ||
      relationshipButton === relationshipButtons.ACCEPT
    ) {
      return relationshipActions.FRIEND;
    } else if (
      relationshipButton === relationshipButtons.UNFRIEND ||
      relationshipButton === relationshipButtons.REJECT ||
      relationshipButton === relationshipButtons.WITHDRAW
    ) {
      return relationshipActions.UNFRIEND;
    } else if (relationshipButton === relationshipButtons.UNBLOCK) {
      return relationshipActions.UNBLOCK;
    }
    invariant(false, 'relationshipButton conditions should be exhaustive');
  }, [relationshipButton]);

  const dispatchActionPromise = useDispatchActionPromise();
  const onButtonPress = React.useCallback(() => {
    dispatchActionPromise(
      updateRelationshipsActionTypes,
      updateRelationship(relationshipAction),
    );
  }, [dispatchActionPromise, relationshipAction, updateRelationship]);

  const colors = useColors();
  const { panelIosHighlightUnderlay } = colors;

  const styles = useStyles(unboundStyles);
  const otherUserInfoUsername = otherUserInfo.username;
  invariant(otherUserInfoUsername, 'Other user username should be specified');

  let relationshipButtonText;
  if (relationshipButton === relationshipButtons.BLOCK) {
    relationshipButtonText = `Block ${otherUserInfoUsername}`;
  } else if (relationshipButton === relationshipButtons.FRIEND) {
    relationshipButtonText = `Add ${otherUserInfoUsername} to friends`;
  } else if (relationshipButton === relationshipButtons.UNFRIEND) {
    relationshipButtonText = `Unfriend ${otherUserInfoUsername}`;
  } else if (relationshipButton === relationshipButtons.UNBLOCK) {
    relationshipButtonText = `Unblock ${otherUserInfoUsername}`;
  } else if (relationshipButton === relationshipButtons.ACCEPT) {
    relationshipButtonText = `Accept friend request from ${otherUserInfoUsername}`;
  } else if (relationshipButton === relationshipButtons.REJECT) {
    relationshipButtonText = `Reject friend request from ${otherUserInfoUsername}`;
  } else if (relationshipButton === relationshipButtons.WITHDRAW) {
    relationshipButtonText = `Withdraw request to friend ${otherUserInfoUsername}`;
  }

  return (
    <View style={styles.container}>
      <Button
        onPress={onButtonPress}
        style={[styles.button, props.buttonStyle]}
        iosFormat="highlight"
        iosHighlightUnderlayColor={panelIosHighlightUnderlay}
      >
        <Text style={styles.text}>{relationshipButtonText}</Text>
      </Button>
    </View>
  );
});

const unboundStyles = {
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  container: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  text: {
    color: 'redText',
    flex: 1,
    fontSize: 16,
  },
};
