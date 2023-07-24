// @flow

import * as React from 'react';

import {
  deleteCommunityRole,
  deleteCommunityRoleActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useRoleMemberCountsForCommunity } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import css from './delete-role-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import Modal from '../modals/modal.react.js';

type DeleteRoleModalProps = {
  +threadInfo: ThreadInfo,
  +defaultRoleID: string,
  +roleID: string,
};

function DeleteRoleModal(props: DeleteRoleModalProps): React.Node {
  const { threadInfo, defaultRoleID, roleID } = props;
  const { popModal } = useModalContext();

  const callDeleteCommunityRole = useServerCall(deleteCommunityRole);
  const dispatchActionPromise = useDispatchActionPromise();

  const roleNamesToMemberCounts = useRoleMemberCountsForCommunity(threadInfo);
  const roleName = threadInfo.roles[roleID].name;
  const memberCount = roleNamesToMemberCounts[roleName];
  const defaultRoleName = threadInfo.roles[defaultRoleID].name;

  let message;
  if (memberCount === 0) {
    message = 'Are you sure you want to delete this role?';
  } else {
    const messageNoun = memberCount === 1 ? 'member' : 'members';
    const messageVerb = memberCount === 1 ? 'is' : 'are';

    message =
      `There ${messageVerb} currently ${memberCount} ${messageNoun} with ` +
      `this role. Deleting this role will automatically assign the members ` +
      `affected to the ${defaultRoleName} role.`;
  }

  const onDeleteRole = React.useCallback(() => {
    dispatchActionPromise(
      deleteCommunityRoleActionTypes,
      callDeleteCommunityRole({
        community: threadInfo.id,
        roleID: roleID,
      }),
    );
    popModal();
  }, [
    callDeleteCommunityRole,
    dispatchActionPromise,
    roleID,
    threadInfo.id,
    popModal,
  ]);

  return (
    <Modal name="Delete role" onClose={popModal} size="large">
      <div className={css.roleDeletionText}>{message}</div>
      <div className={css.buttonsContainer}>
        <Button
          variant="outline"
          className={css.cancelButton}
          buttonColor={buttonThemes.outline}
          onClick={popModal}
        >
          Cancel
        </Button>
        <Button
          variant="filled"
          className={css.deleteRoleButton}
          buttonColor={buttonThemes.danger}
          onClick={onDeleteRole}
        >
          Yes, delete role
        </Button>
      </div>
    </Modal>
  );
}

export default DeleteRoleModal;
