// @flow

import * as React from 'react';

import {
  deleteCommunityRoleActionTypes,
  useDeleteCommunityRole,
} from 'lib/actions/thread-actions.js';
import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { constructRoleDeletionMessagePrompt } from 'lib/utils/role-utils.js';

import Alert from '../utils/alert.js';

function useDisplayDeleteRoleAlert(
  threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  existingRoleID: string,
  defaultRoleID: string,
  memberCount: number,
): () => void {
  const defaultRoleName = threadInfo.roles[defaultRoleID].name;
  const callDeleteCommunityRole = useDeleteCommunityRole();
  const dispatchActionPromise = useDispatchActionPromise();

  const onDeleteRole = React.useCallback(() => {
    void dispatchActionPromise(
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
