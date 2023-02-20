// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Alert, Text, View } from 'react-native';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import {
  getRelationshipActionText,
  getRelationshipDispatchAction,
} from 'lib/shared/relationship-utils.js';
import { getSingleOtherUser } from 'lib/shared/thread-utils.js';
import {
  type RelationshipAction,
  type RelationshipButton,
} from 'lib/types/relationship-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import Button from '../../components/button.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles, useColors } from '../../themes/colors.js';
import type { ViewStyle } from '../../types/styles.js';

type Props = {
  +threadInfo: ThreadInfo,
  +buttonStyle: ViewStyle,
  +relationshipButton: RelationshipButton,
};

const ThreadSettingsEditRelationship: React.ComponentType<Props> =
  React.memo<Props>(function ThreadSettingsEditRelationship(props: Props) {
    const otherUserInfoFromRedux = useSelector(state => {
      const currentUserID = state.currentUserInfo?.id;
      const otherUserID = getSingleOtherUser(props.threadInfo, currentUserID);
      invariant(otherUserID, 'Other user should be specified');

      const { userInfos } = state.userStore;
      return userInfos[otherUserID];
    });
    invariant(otherUserInfoFromRedux, 'Other user info should be specified');

    const [otherUserInfo] = useENSNames([otherUserInfoFromRedux]);

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
    const relationshipAction = React.useMemo(
      () => getRelationshipDispatchAction(relationshipButton),
      [relationshipButton],
    );

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

    const relationshipButtonText = React.useMemo(
      () =>
        getRelationshipActionText(relationshipButton, otherUserInfoUsername),
      [otherUserInfoUsername, relationshipButton],
    );

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

export default ThreadSettingsEditRelationship;
