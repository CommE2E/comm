// @flow

import * as React from 'react';

import { useRemoveUsersFromThread } from 'lib/actions/thread-actions.js';
import { removeMemberFromThread } from 'lib/shared/thread-actions-utils.js';
import { stringForUser } from 'lib/shared/user-utils.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import ThreadSettingsMemberTooltipButton from './thread-settings-member-tooltip-button.react.js';
import type { AppNavigationProp } from '../../navigation/app-navigator.react';
import { ChangeRolesScreenRouteName } from '../../navigation/route-names.js';
import {
  type TooltipProps,
  createTooltip,
  type TooltipMenuProps,
  type TooltipParams,
  type TooltipRoute,
} from '../../tooltip/tooltip.react.js';
import Alert from '../../utils/alert.js';

export type ThreadSettingsMemberTooltipModalParams = TooltipParams<{
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
}>;

function useOnRemoveUser(
  route: TooltipRoute<'ThreadSettingsMemberTooltipModal'>,
) {
  const { memberInfo, threadInfo } = route.params;
  const boundRemoveUsersFromThread = useRemoveUsersFromThread();
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

function useOnChangeRole(
  route: TooltipRoute<'ThreadSettingsMemberTooltipModal'>,
  navigation: AppNavigationProp<'ThreadSettingsMemberTooltipModal'>,
) {
  const { threadInfo, memberInfo } = route.params;
  return React.useCallback(() => {
    navigation.navigate<'ChangeRolesScreen'>({
      name: ChangeRolesScreenRouteName,
      params: {
        threadInfo,
        memberInfo,
        role: memberInfo.role,
      },
      key: route.key,
    });
  }, [navigation, route.key, threadInfo, memberInfo]);
}

function TooltipMenu(
  props: TooltipMenuProps<'ThreadSettingsMemberTooltipModal'>,
): React.Node {
  const { route, navigation, tooltipItem: TooltipItem } = props;

  const onChangeRole = useOnChangeRole(route, navigation);
  const onRemoveUser = useOnRemoveUser(route);

  return (
    <>
      <TooltipItem
        id="change_role"
        text="Change role"
        onPress={onChangeRole}
        key="change_role"
      />
      <TooltipItem
        id="remove_user"
        text="Remove user"
        onPress={onRemoveUser}
        key="remove_user"
      />
    </>
  );
}

const ThreadSettingsMemberTooltipModal: React.ComponentType<
  TooltipProps<'ThreadSettingsMemberTooltipModal'>,
> = createTooltip<'ThreadSettingsMemberTooltipModal'>(
  ThreadSettingsMemberTooltipButton,
  TooltipMenu,
);

export default ThreadSettingsMemberTooltipModal;
