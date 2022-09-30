// @flow

import * as React from 'react';
import { Alert, TouchableOpacity } from 'react-native';

import {
  updateRelationshipsActionTypes,
  updateRelationships,
} from 'lib/actions/relationship-actions';
import { stringForUser } from 'lib/shared/user-utils';
import type { RelativeUserInfo } from 'lib/types/user-types';
import type { DispatchFunctions, BindServerCall } from 'lib/utils/action-utils';

import PencilIcon from '../components/pencil-icon.react';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
} from '../navigation/tooltip.react';

type Action = 'unfriend' | 'unblock';

export type RelationshipListItemTooltipModalParams = TooltipParams<{
  +relativeUserInfo: RelativeUserInfo,
}>;

type OnRemoveUserProps = {
  ...RelationshipListItemTooltipModalParams,
  +action: Action,
};
function onRemoveUser(
  props: OnRemoveUserProps,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
) {
  const boundRemoveRelationships = bindServerCall(updateRelationships);
  const callRemoveRelationships = async () => {
    try {
      return await boundRemoveRelationships({
        action: props.action,
        userIDs: [props.relativeUserInfo.id],
      });
    } catch (e) {
      Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
        cancelable: true,
      });
      throw e;
    }
  };
  const onConfirmRemoveUser = () => {
    const customKeyName = `${updateRelationshipsActionTypes.started}:${props.relativeUserInfo.id}`;
    dispatchFunctions.dispatchActionPromise(
      updateRelationshipsActionTypes,
      callRemoveRelationships(),
      { customKeyName },
    );
  };

  const userText = stringForUser(props.relativeUserInfo);
  const action = {
    unfriend: 'removal',
    unblock: 'unblock',
  }[props.action];
  const message = {
    unfriend: `remove ${userText} from friends?`,
    unblock: `unblock ${userText}?`,
  }[props.action];
  Alert.alert(
    `Confirm ${action}`,
    `Are you sure you want to ${message}`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirmRemoveUser },
    ],
    { cancelable: true },
  );
}

const spec = {
  entries: [
    {
      id: 'unfriend',
      text: 'Unfriend',
      onPress: (route, dispatchFunctions, bindServerCall) =>
        onRemoveUser(
          { ...route.params, action: 'unfriend' },
          dispatchFunctions,
          bindServerCall,
        ),
    },
    {
      id: 'unblock',
      text: 'Unblock',
      onPress: (route, dispatchFunctions, bindServerCall) =>
        onRemoveUser(
          { ...route.params, action: 'unblock' },
          dispatchFunctions,
          bindServerCall,
        ),
    },
  ],
};

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
  spec,
);

export default RelationshipListItemTooltipModal;
