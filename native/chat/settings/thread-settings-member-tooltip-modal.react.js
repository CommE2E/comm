// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  removeUsersFromThread,
  changeThreadMemberRoles,
} from 'lib/actions/thread-actions.js';
import {
  memberIsAdmin,
  removeMemberFromThread,
  switchMemberAdminRoleInThread,
} from 'lib/shared/thread-utils.js';
import { stringForUser } from 'lib/shared/user-utils.js';
import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import ThreadSettingsMemberTooltipButton from './thread-settings-member-tooltip-button.react.js';
import {
  createTooltip,
  type TooltipParams,
  type TooltipRoute,
  type BaseTooltipProps,
  type TooltipMenuProps,
} from '../../tooltip/tooltip.react.js';

export type ThreadSettingsMemberTooltipModalParams = TooltipParams<{
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
}>;

function useOnRemoveUser(
  route: TooltipRoute<'ThreadSettingsMemberTooltipModal'>,
) {
  const { memberInfo, threadInfo } = route.params;
  const boundRemoveUsersFromThread = useServerCall(removeUsersFromThread);
  const dispatchActionPromise = useDispatchActionPromise();

  const onConfirmRemoveUser = React.useCallback(
    () =>
      removeMemberFromThread(
        threadInfo,
        memberInfo,
        dispatchActionPromise,
        boundRemoveUsersFromThread,
      ),
    [threadInfo, memberInfo, dispatchActionPromise, boundRemoveUsersFromThread],
  );

  const userText = stringForUser(memberInfo);
  return React.useCallback(() => {
    Alert.alert(
      'Confirm removal',
      `Are you sure you want to remove ${userText} from this chat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: onConfirmRemoveUser },
      ],
      { cancelable: true },
    );
  }, [onConfirmRemoveUser, userText]);
}

function useOnToggleAdmin(
  route: TooltipRoute<'ThreadSettingsMemberTooltipModal'>,
) {
  const { memberInfo, threadInfo } = route.params;
  const boundChangeThreadMemberRoles = useServerCall(changeThreadMemberRoles);
  const dispatchActionPromise = useDispatchActionPromise();

  const isCurrentlyAdmin = memberIsAdmin(memberInfo, threadInfo);
  const onConfirmMakeAdmin = React.useCallback(
    () =>
      switchMemberAdminRoleInThread(
        threadInfo,
        memberInfo,
        isCurrentlyAdmin,
        dispatchActionPromise,
        boundChangeThreadMemberRoles,
      ),
    [
      threadInfo,
      memberInfo,
      isCurrentlyAdmin,
      dispatchActionPromise,
      boundChangeThreadMemberRoles,
    ],
  );

  const userText = stringForUser(memberInfo);
  const actionClause = isCurrentlyAdmin
    ? `remove ${userText} as an admin`
    : `make ${userText} an admin`;
  return React.useCallback(() => {
    Alert.alert(
      'Confirm action',
      `Are you sure you want to ${actionClause} of this chat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: onConfirmMakeAdmin },
      ],
      { cancelable: true },
    );
  }, [onConfirmMakeAdmin, actionClause]);
}

function TooltipMenu(
  props: TooltipMenuProps<'ThreadSettingsMemberTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem } = props;

  const onRemoveUser = useOnRemoveUser(route);
  const onToggleAdmin = useOnToggleAdmin(route);

  return (
    <>
      <TooltipItem
        id="remove_user"
        text="Remove user"
        onPress={onRemoveUser}
        key="remove_user"
      />
      <TooltipItem
        id="remove_admin"
        text="Remove admin"
        onPress={onToggleAdmin}
        key="remove_admin"
      />
      <TooltipItem
        id="make_admin"
        text="Make admin"
        onPress={onToggleAdmin}
        key="make_admin"
      />
    </>
  );
}

const ThreadSettingsMemberTooltipModal: React.ComponentType<
  BaseTooltipProps<'ThreadSettingsMemberTooltipModal'>,
> = createTooltip<'ThreadSettingsMemberTooltipModal'>(
  ThreadSettingsMemberTooltipButton,
  TooltipMenu,
);

export default ThreadSettingsMemberTooltipModal;
