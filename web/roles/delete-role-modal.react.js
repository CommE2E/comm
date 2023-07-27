// @flow

import * as React from 'react';

import {
  deleteCommunityRole,
  deleteCommunityRoleActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useRoleMemberCountsForCommunity } from 'lib/shared/thread-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { constructRoleDeletionMessagePrompt } from 'lib/utils/role-utils.js';

import css from './delete-role-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import Modal from '../modals/modal.react.js';
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

  const callDeleteCommunityRole = useServerCall(deleteCommunityRole);
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
    dispatchActionPromise(
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
          {deleteButtonContent}
        </Button>
      </div>
    </Modal>
  );
}

export default DeleteRoleModal;
