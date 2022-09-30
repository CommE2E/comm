// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  removeUsersFromThread,
  changeThreadMemberRoles,
} from 'lib/actions/thread-actions';
import {
  memberIsAdmin,
  removeMemberFromThread,
  switchMemberAdminRoleInThread,
} from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import type { DispatchFunctions, BindServerCall } from 'lib/utils/action-utils';

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
  bindServerCall: BindServerCall,
) {
  const { memberInfo, threadInfo } = route.params;
  const boundRemoveUsersFromThread = bindServerCall(removeUsersFromThread);
  const onConfirmRemoveUser = () =>
    removeMemberFromThread(
      threadInfo,
      memberInfo,
      dispatchFunctions.dispatchActionPromise,
      boundRemoveUsersFromThread,
    );

  const userText = stringForUser(memberInfo);
  Alert.alert(
    'Confirm removal',
    `Are you sure you want to remove ${userText} from this chat?`,
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
  bindServerCall: BindServerCall,
) {
  const { memberInfo, threadInfo } = route.params;
  const isCurrentlyAdmin = memberIsAdmin(memberInfo, threadInfo);
  const boundChangeThreadMemberRoles = bindServerCall(changeThreadMemberRoles);
  const onConfirmMakeAdmin = () =>
    switchMemberAdminRoleInThread(
      threadInfo,
      memberInfo,
      isCurrentlyAdmin,
      dispatchFunctions.dispatchActionPromise,
      boundChangeThreadMemberRoles,
    );

  const userText = stringForUser(memberInfo);
  const actionClause = isCurrentlyAdmin
    ? `remove ${userText} as an admin`
    : `make ${userText} an admin`;
  Alert.alert(
    'Confirm action',
    `Are you sure you want to ${actionClause} of this chat?`,
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
