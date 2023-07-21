// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  deleteCommunityRole,
  deleteCommunityRoleActionTypes,
} from 'lib/actions/thread-actions.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

function useDisplayDeleteRoleAlert(
  threadInfo: ThreadInfo,
  existingRoleID: string,
  defaultRoleID: string,
  memberCount: number,
): () => void {
  const defaultRoleName = threadInfo.roles[defaultRoleID].name;
  const callDeleteCommunityRole = useServerCall(deleteCommunityRole);
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

  let message;
  if (memberCount === 0) {
    message = 'Are you sure you want to delete this role?';
  } else {
    const messageNoun = memberCount === 1 ? 'member' : 'members';
    const messageVerb = memberCount === 1 ? 'is' : 'are';
    message =
      `There ${messageVerb} currently ${memberCount} ${messageNoun} with ` +
      `this role. Deleting the role will automatically assign the members ` +
      `affected to the ${defaultRoleName} role.`;
  }

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
