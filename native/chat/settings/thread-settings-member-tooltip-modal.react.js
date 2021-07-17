// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Alert } from 'react-native';

import {
  removeUsersFromThreadActionTypes,
  removeUsersFromThread,
  changeThreadMemberRolesActionTypes,
  changeThreadMemberRoles,
} from 'lib/actions/thread-actions';
import { memberIsAdmin, roleIsAdminRole } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import type { DispatchFunctions, ActionFunc } from 'lib/utils/action-utils';

import {
  createTooltip,
  type TooltipParams,
  type TooltipRoute,
  type BaseTooltipProps,
} from '../../navigation/tooltip.react';
import ThreadSettingsMemberTooltipButton from './thread-settings-member-tooltip-button.react';

export type ThreadSettingsMemberTooltipModalParams = TooltipParams<{
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
}>;

function onRemoveUser(
  route: TooltipRoute<'ThreadSettingsMemberTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: <F>(serverCall: ActionFunc<F>) => F,
) {
  const { memberInfo, threadInfo } = route.params;
  const boundRemoveUsersFromThread = bindServerCall(removeUsersFromThread);
  const onConfirmRemoveUser = () => {
    const customKeyName = `${removeUsersFromThreadActionTypes.started}:${memberInfo.id}`;
    dispatchFunctions.dispatchActionPromise(
      removeUsersFromThreadActionTypes,
      boundRemoveUsersFromThread(threadInfo.id, [memberInfo.id]),
      { customKeyName },
    );
  };

  const userText = stringForUser(memberInfo);
  Alert.alert(
    'Confirm removal',
    `Are you sure you want to remove ${userText} from this thread?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirmRemoveUser },
    ],
    { cancelable: true },
  );
}

function onToggleAdmin(
  route: TooltipRoute<'ThreadSettingsMemberTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: <F>(serverCall: ActionFunc<F>) => F,
) {
  const { memberInfo, threadInfo } = route.params;
  const isCurrentlyAdmin = memberIsAdmin(memberInfo, threadInfo);
  const boundChangeThreadMemberRoles = bindServerCall(changeThreadMemberRoles);
  const onConfirmMakeAdmin = () => {
    let newRole = null;
    for (const roleID in threadInfo.roles) {
      const role = threadInfo.roles[roleID];
      if (isCurrentlyAdmin && role.isDefault) {
        newRole = role.id;
        break;
      } else if (!isCurrentlyAdmin && roleIsAdminRole(role)) {
        newRole = role.id;
        break;
      }
    }
    invariant(newRole !== null, 'Could not find new role');

    const customKeyName = `${changeThreadMemberRolesActionTypes.started}:${memberInfo.id}`;
    dispatchFunctions.dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      boundChangeThreadMemberRoles(threadInfo.id, [memberInfo.id], newRole),
      { customKeyName },
    );
  };

  const userText = stringForUser(memberInfo);
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
    { cancelable: true },
  );
}

const spec = {
  entries: [
    { id: 'remove_user', text: 'Remove user', onPress: onRemoveUser },
    { id: 'remove_admin', text: 'Remove admin', onPress: onToggleAdmin },
    { id: 'make_admin', text: 'Make admin', onPress: onToggleAdmin },
  ],
};

const ThreadSettingsMemberTooltipModal: React.ComponentType<
  BaseTooltipProps<'ThreadSettingsMemberTooltipModal'>,
> = createTooltip<'ThreadSettingsMemberTooltipModal'>(
  ThreadSettingsMemberTooltipButton,
  spec,
);

export default ThreadSettingsMemberTooltipModal;
