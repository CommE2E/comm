// @flow

import * as React from 'react';
import { Alert, TouchableOpacity } from 'react-native';

import {
  updateRelationshipsActionTypes,
  updateRelationships,
} from 'lib/actions/relationship-actions';
import { stringForUser } from 'lib/shared/user-utils';
import type { RelativeUserInfo } from 'lib/types/user-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import PencilIcon from '../components/pencil-icon.react';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react';

type Action = 'unfriend' | 'unblock';

export type RelationshipListItemTooltipModalParams = TooltipParams<{
  +relativeUserInfo: RelativeUserInfo,
}>;

type OnRemoveUserProps = {
  ...RelationshipListItemTooltipModalParams,
  +action: Action,
};
function useRelationshipAction(input: OnRemoveUserProps) {
  const boundRemoveRelationships = useServerCall(updateRelationships);
  const dispatchActionPromise = useDispatchActionPromise();
  const userText = stringForUser(input.relativeUserInfo);

  return React.useCallback(() => {
    const callRemoveRelationships = async () => {
      try {
        return await boundRemoveRelationships({
          action: input.action,
          userIDs: [input.relativeUserInfo.id],
        });
      } catch (e) {
        Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
          cancelable: true,
        });
        throw e;
      }
    };
    const onConfirmRemoveUser = () => {
      const customKeyName = `${updateRelationshipsActionTypes.started}:${input.relativeUserInfo.id}`;
      dispatchActionPromise(
        updateRelationshipsActionTypes,
        callRemoveRelationships(),
        { customKeyName },
      );
    };
    const action = {
      unfriend: 'removal',
      unblock: 'unblock',
    }[input.action];
    const message = {
      unfriend: `remove ${userText} from friends?`,
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
  }, [boundRemoveRelationships, dispatchActionPromise, userText, input]);
}

function TooltipMenu(
  props: TooltipMenuProps<'RelationshipListItemTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem } = props;

  const onRemoveUser = useRelationshipAction({
    ...route.params,
    action: 'unfriend',
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
  +navigation: AppNavigationProp<'RelationshipListItemTooltipModal'>,
  ...
};
class RelationshipListItemTooltipButton extends React.PureComponent<Props> {
  render() {
    return (
      <TouchableOpacity onPress={this.onPress}>
        <PencilIcon />
      </TouchableOpacity>
    );
  }

  onPress = () => {
    this.props.navigation.goBackOnce();
  };
}

const RelationshipListItemTooltipModal: React.ComponentType<
  BaseTooltipProps<'RelationshipListItemTooltipModal'>,
> = createTooltip<'RelationshipListItemTooltipModal'>(
  RelationshipListItemTooltipButton,
  TooltipMenu,
);

export default RelationshipListItemTooltipModal;
