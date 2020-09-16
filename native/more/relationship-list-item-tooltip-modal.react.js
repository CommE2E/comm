// @flow

import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';
import type { RelativeUserInfo } from 'lib/types/user-types';
import type { AppNavigationProp } from '../navigation/app-navigator.react';

import * as React from 'react';
import { Alert, TouchableOpacity } from 'react-native';

import { stringForUser } from 'lib/shared/user-utils';
import {
  updateRelationshipsActionTypes,
  updateRelationships,
} from 'lib/actions/relationship-actions';

import {
  createTooltip,
  type TooltipParams,
  type TooltipEntry,
} from '../navigation/tooltip.react';
import PencilIcon from '../components/pencil-icon.react';

type Action = 'unfriend' | 'unblock';

export type RelationshipListItemTooltipModalParams = TooltipParams<{|
  +relativeUserInfo: RelativeUserInfo,
|}>;

type OnRemoveUserProps = {|
  ...RelationshipListItemTooltipModalParams,
  +action: Action,
|};
function onRemoveUser(
  props: OnRemoveUserProps,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
) {
  const boundRemoveRelationships = bindServerCall(updateRelationships);
  const onConfirmRemoveUser = () => {
    const customKeyName = `${updateRelationshipsActionTypes.started}:${props.relativeUserInfo.id}`;
    dispatchFunctions.dispatchActionPromise(
      updateRelationshipsActionTypes,
      boundRemoveRelationships({
        action: props.action,
        userIDs: [props.relativeUserInfo.id],
      }),
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
      onPress: (props, dispatchFunctions, bindServerCall) =>
        onRemoveUser(
          { ...props, action: 'unfriend' },
          dispatchFunctions,
          bindServerCall,
        ),
    },
    {
      id: 'unblock',
      text: 'Unblock',
      onPress: (props, dispatchFunctions, bindServerCall) =>
        onRemoveUser(
          { ...props, action: 'unblock' },
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

const RelationshipListItemTooltipModal = createTooltip<
  'RelationshipListItemTooltipModal',
  TooltipEntry<'RelationshipListItemTooltipModal'>,
>(RelationshipListItemTooltipButton, spec);

export default RelationshipListItemTooltipModal;
