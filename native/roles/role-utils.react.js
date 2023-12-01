// @flow

import * as React from 'react';

import {
  useDeleteCommunityRole,
  deleteCommunityRoleActionTypes,
} from 'lib/actions/thread-actions.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';
import { constructRoleDeletionMessagePrompt } from 'lib/utils/role-utils.js';

import Alert from '../utils/alert.js';

function useDisplayDeleteRoleAlert(
  threadInfo: ThreadInfo,
  existingRoleID: string,
  defaultRoleID: string,
  memberCount: number,
): () => void {
  const defaultRoleName = threadInfo.roles[defaultRoleID].name;
  const callDeleteCommunityRole = useDeleteCommunityRole();
  const dispatchActionPromise = useDispatchActionPromise();

  const onDeleteRole = React.useCallback(() => {
    dispatchActionPromise(
      deleteCommunityRoleActionTypes,
      callDeleteCommunityRole({
        community: threadInfo.id,
        roleID: existingRoleID,
      }),
    );
  }, [
    callDeleteCommunityRole,
    dispatchActionPromise,
    existingRoleID,
    threadInfo.id,
  ]);

  const message = constructRoleDeletionMessagePrompt(
    defaultRoleName,
    memberCount,
  );

  return React.useCallback(
    () =>
      Alert.alert('Delete role', message, [
        {
          text: 'Yes, delete role',
          style: 'destructive',
          onPress: onDeleteRole,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]),
    [message, onDeleteRole],
  );
}

export { useDisplayDeleteRoleAlert };
