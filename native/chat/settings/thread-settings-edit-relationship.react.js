// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from 'lib/actions/relationship-actions.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import {
  getRelationshipActionText,
  getRelationshipDispatchAction,
} from 'lib/shared/relationship-utils.js';
import { getSingleOtherUser } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  type TraditionalRelationshipAction,
  type RelationshipButton,
} from 'lib/types/relationship-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import Button from '../../components/button.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useColors, useStyles } from '../../themes/colors.js';
import type { ViewStyle } from '../../types/styles.js';
import { UnknownErrorAlertDetails } from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';

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

    const callUpdateRelationships = useLegacyAshoatKeyserverCall(
      serverUpdateRelationships,
    );
    const updateRelationship = React.useCallback(
      async (action: TraditionalRelationshipAction) => {
        try {
          return await callUpdateRelationships({
            action,
            userIDs: [otherUserInfo.id],
          });
        } catch (e) {
          Alert.alert(
            UnknownErrorAlertDetails.title,
            UnknownErrorAlertDetails.message,
            [{ text: 'OK' }],
            {
              cancelable: true,
            },
          );
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
      void dispatchActionPromise(
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
