// @flow

import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import { updateRelationshipsActionTypes } from 'lib/actions/relationship-actions.js';
import { useUpdateRelationships } from 'lib/hooks/relationship-hooks.js';
import { stringForUser } from 'lib/shared/user-utils.js';
import type { RelativeUserInfo } from 'lib/types/user-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import PencilIcon from '../components/pencil-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useColors } from '../themes/colors.js';
import {
  createTooltip,
  type TooltipParams,
  type TooltipProps,
  type TooltipMenuProps,
  type TooltipRoute,
} from '../tooltip/tooltip.react.js';
import type { UserProfileBottomSheetNavigationProp } from '../user-profile/user-profile-bottom-sheet-navigator.react.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type Action = 'unfriend' | 'block' | 'unblock';
type TooltipButtonIcon = 'pencil' | 'menu';

export type UserRelationshipTooltipModalParams = TooltipParams<{
  +tooltipButtonIcon: TooltipButtonIcon,
  +relativeUserInfo: RelativeUserInfo,
}>;

type OnRemoveUserProps = {
  ...UserRelationshipTooltipModalParams,
  +action: Action,
};
function useRelationshipAction(input: OnRemoveUserProps) {
  const updateRelationships = useUpdateRelationships();
  const dispatchActionPromise = useDispatchActionPromise();
  const userText = stringForUser(input.relativeUserInfo);

  return React.useCallback(() => {
    const callRemoveRelationships = async () => {
      try {
        return await updateRelationships(input.action, [
          input.relativeUserInfo.id,
        ]);
      } catch (e) {
        Alert.alert(
          unknownErrorAlertDetails.title,
          unknownErrorAlertDetails.message,
          [{ text: 'OK' }],
          {
            cancelable: true,
          },
        );
        throw e;
      }
    };
    const onConfirmRemoveUser = () => {
      const customKeyName = `${updateRelationshipsActionTypes.started}:${input.relativeUserInfo.id}`;
      void dispatchActionPromise(
        updateRelationshipsActionTypes,
        callRemoveRelationships(),
        { customKeyName },
      );
    };
    const action = {
      unfriend: 'removal',
      block: 'block',
      unblock: 'unblock',
    }[input.action];
    const message = {
      unfriend: `remove ${userText} from friends?`,
      block: `block ${userText}`,
      unblock: `unblock ${userText}?`,
    }[input.action];
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${message}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: onConfirmRemoveUser },
      ],
      { cancelable: true },
    );
  }, [updateRelationships, dispatchActionPromise, userText, input]);
}

function TooltipMenu(
  props: TooltipMenuProps<'UserRelationshipTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem } = props;

  const onRemoveUser = useRelationshipAction({
    ...route.params,
    action: 'unfriend',
  });

  const onBlockUser = useRelationshipAction({
    ...route.params,
    action: 'block',
  });

  const onUnblockUser = useRelationshipAction({
    ...route.params,
    action: 'unblock',
  });

  return (
    <>
      <TooltipItem
        id="unfriend"
        text="Unfriend"
        onPress={onRemoveUser}
        key="unfriend"
      />
      <TooltipItem id="block" text="Block" onPress={onBlockUser} key="block" />
      <TooltipItem
        id="unblock"
        text="Unblock"
        onPress={onUnblockUser}
        key="unblock"
      />
    </>
  );
}

type Props = {
  +navigation: UserProfileBottomSheetNavigationProp<'UserRelationshipTooltipModal'>,
  +route: TooltipRoute<'UserRelationshipTooltipModal'>,
  ...
};

function UserRelationshipTooltipButton(props: Props): React.Node {
  const { navigation, route } = props;

  const { goBackOnce } = navigation;
  const { tooltipButtonIcon } = route.params;

  const colors = useColors();

  const icon = React.useMemo(() => {
    if (tooltipButtonIcon === 'pencil') {
      return <PencilIcon />;
    }
    return (
      <SWMansionIcon
        name="menu-vertical"
        size={24}
        color={colors.modalBackgroundLabel}
      />
    );
  }, [colors.modalBackgroundLabel, tooltipButtonIcon]);

  return <TouchableOpacity onPress={goBackOnce}>{icon}</TouchableOpacity>;
}

const UserRelationshipTooltipModal: React.ComponentType<
  TooltipProps<'UserRelationshipTooltipModal'>,
> = createTooltip<'UserRelationshipTooltipModal'>(
  UserRelationshipTooltipButton,
  TooltipMenu,
);

export default UserRelationshipTooltipModal;
