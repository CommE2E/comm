// @flow

import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';

import { Alert } from 'react-native';
import invariant from 'invariant';

import { stringForUser } from 'lib/shared/user-utils';
import {
  removeUsersFromThreadActionTypes,
  removeUsersFromThread,
  changeThreadMemberRolesActionTypes,
  changeThreadMemberRoles,
} from 'lib/actions/thread-actions';
import { memberIsAdmin } from 'lib/shared/thread-utils';

import {
  createTooltip,
  type TooltipParams,
} from '../../navigation/tooltip.react';
import ThreadSettingsMemberTooltipButton from './thread-settings-member-tooltip-button.react';

type CustomProps = {
  memberInfo: RelativeMemberInfo,
  threadInfo: ThreadInfo,
};

export type ThreadSettingsMemberTooltipModalParams = TooltipParams<CustomProps>;

function onRemoveUser(
  props: CustomProps,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
) {
  const boundRemoveUsersFromThread = bindServerCall(removeUsersFromThread);
  const onConfirmRemoveUser = () => {
    const customKeyName =
      removeUsersFromThreadActionTypes.started + `:${props.memberInfo.id}`;
    dispatchFunctions.dispatchActionPromise(
      removeUsersFromThreadActionTypes,
      boundRemoveUsersFromThread(props.threadInfo.id, [props.memberInfo.id]),
      { customKeyName },
    );
  };

  const userText = stringForUser(props.memberInfo);
  Alert.alert(
    'Confirm removal',
    `Are you sure you want to remove ${userText} from this thread?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirmRemoveUser },
    ],
  );
}

function onToggleAdmin(
  props: CustomProps,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
) {
  const isCurrentlyAdmin = memberIsAdmin(props.memberInfo, props.threadInfo);
  const boundChangeThreadMemberRoles = bindServerCall(changeThreadMemberRoles);
  const onConfirmMakeAdmin = () => {
    let newRole = null;
    for (let roleID in props.threadInfo.roles) {
      const role = props.threadInfo.roles[roleID];
      if (isCurrentlyAdmin && role.isDefault) {
        newRole = role.id;
        break;
      } else if (!isCurrentlyAdmin && role.name === 'Admins') {
        newRole = role.id;
        break;
      }
    }
    invariant(newRole !== null, 'Could not find new role');

    const customKeyName =
      changeThreadMemberRolesActionTypes.started + `:${props.memberInfo.id}`;
    dispatchFunctions.dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      boundChangeThreadMemberRoles(
        props.threadInfo.id,
        [props.memberInfo.id],
        newRole,
      ),
      { customKeyName },
    );
  };

  const userText = stringForUser(props.memberInfo);
  const actionClause = isCurrentlyAdmin
    ? `remove ${userText} as an admin`
    : `make ${userText} an admin`;
  Alert.alert(
    'Confirm action',
    `Are you sure you want to ${actionClause} of this thread?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirmMakeAdmin },
    ],
  );
}

const spec = {
  entries: [
    { id: 'remove_user', text: 'Remove user', onPress: onRemoveUser },
    { id: 'remove_admin', text: 'Remove admin', onPress: onToggleAdmin },
    { id: 'make_admin', text: 'Make admin', onPress: onToggleAdmin },
  ],
};

const ThreadSettingsMemberTooltipModal = createTooltip(
  ThreadSettingsMemberTooltipButton,
  spec,
);

export default ThreadSettingsMemberTooltipModal;
