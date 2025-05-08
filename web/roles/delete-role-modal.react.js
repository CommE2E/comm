// @flow

import * as React from 'react';

import { deleteCommunityRoleActionTypes } from 'lib/actions/thread-action-types.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useDeleteCommunityRole } from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useRoleMemberCountsForCommunity } from 'lib/shared/thread-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { constructRoleDeletionMessagePrompt } from 'lib/utils/role-utils.js';

import css from './delete-role-modal.css';
import LoadingIndicator from '../loading-indicator.react.js';
import ConfirmationAlert from '../modals/confirmation-alert.react.js';
import { useSelector } from '../redux/redux-utils.js';

const deleteRoleLoadingStatusSelector = createLoadingStatusSelector(
  deleteCommunityRoleActionTypes,
);

type DeleteRoleModalProps = {
  +threadInfo: ThreadInfo,
  +defaultRoleID: string,
  +roleID: string,
};

function DeleteRoleModal(props: DeleteRoleModalProps): React.Node {
  const { threadInfo, defaultRoleID, roleID } = props;
  const { popModal } = useModalContext();

  const callDeleteCommunityRole = useDeleteCommunityRole();
  const dispatchActionPromise = useDispatchActionPromise();

  const deleteRoleLoadingStatus: LoadingStatus = useSelector(
    deleteRoleLoadingStatusSelector,
  );

  const roleNamesToMemberCounts = useRoleMemberCountsForCommunity(threadInfo);
  const roleName = threadInfo.roles[roleID].name;
  const memberCount = roleNamesToMemberCounts[roleName];
  const defaultRoleName = threadInfo.roles[defaultRoleID].name;

  const message = constructRoleDeletionMessagePrompt(
    defaultRoleName,
    memberCount,
  );

  const onDeleteRole = React.useCallback(() => {
    void dispatchActionPromise(
      deleteCommunityRoleActionTypes,
      (async () => {
        const response = await callDeleteCommunityRole({
          community: threadInfo.id,
          roleID: roleID,
        });
        popModal();
        return response;
      })(),
    );
  }, [
    callDeleteCommunityRole,
    dispatchActionPromise,
    roleID,
    threadInfo.id,
    popModal,
  ]);

  const deleteButtonContent = React.useMemo(() => {
    if (deleteRoleLoadingStatus === 'loading') {
      return (
        <LoadingIndicator status={deleteRoleLoadingStatus} size="medium" />
      );
    }
    return 'Yes, delete role';
  }, [deleteRoleLoadingStatus]);

  return (
    <ConfirmationAlert
      title="Delete role"
      confirmationButtonContent={deleteButtonContent}
      onConfirm={onDeleteRole}
      isDestructive
    >
      <div className={css.roleDeletionText}>{message}</div>
    </ConfirmationAlert>
  );
}

export default DeleteRoleModal;
