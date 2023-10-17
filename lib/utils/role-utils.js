// @flow

import * as React from 'react';

function constructRoleDeletionMessagePrompt(
  defaultRoleName: string,
  memberCount: number,
): string {
  let message;
  if (memberCount === 0) {
    message = 'Are you sure you want to delete this role?';
  } else {
    const messageNoun = memberCount === 1 ? 'member' : 'members';
    const messageVerb = memberCount === 1 ? 'is' : 'are';
    message =
      `There ${messageVerb} currently ${memberCount} ${messageNoun} with ` +
      `this role. Deleting the role will automatically assign the ` +
      `${messageNoun} affected to the ${defaultRoleName} role.`;
  }

  return message;
}

type RoleDeletableAndEditableStatus = {
  +isDeletable: boolean,
  +isEditable: boolean,
};
function useRoleDeletableAndEditableStatus(
  roleName: string,
  defaultRoleID: string,
  existingRoleID: string,
): RoleDeletableAndEditableStatus {
  return React.useMemo(() => {
    const canDelete = roleName !== 'Admins' && defaultRoleID !== existingRoleID;
    const canEdit = roleName !== 'Admins';

    return {
      isDeletable: canDelete,
      isEditable: canEdit,
    };
  }, [roleName, defaultRoleID, existingRoleID]);
}

export {
  constructRoleDeletionMessagePrompt,
  useRoleDeletableAndEditableStatus,
};
