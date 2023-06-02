// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  changeThreadMemberRoles,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { RelativeMemberInfo, ThreadInfo } from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import { values } from 'lib/utils/objects.js';

import css from './change-member-role-modal.css';
import Button, { buttonThemes } from '../../../components/button.react.js';
import Dropdown from '../../../components/dropdown.react.js';
import UserAvatar from '../../../components/user-avatar.react.js';
import Modal from '../../modal.react.js';
import UnsavedChangesModal from '../../unsaved-changes-modal.react.js';

type ChangeMemberRoleModalProps = {
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
};

function ChangeMemberRoleModal(props: ChangeMemberRoleModalProps): React.Node {
  const { memberInfo, threadInfo } = props;
  const { pushModal, popModal } = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadMemberRoles = useServerCall(changeThreadMemberRoles);
  const modalName = 'Change Role';

  const roleOptions = React.useMemo(
    () =>
      values(threadInfo.roles).map(role => ({
        id: role.id,
        name: role.name,
      })),
    [threadInfo.roles],
  );

  const initialSelectedRole = React.useMemo(() => {
    if (!memberInfo.role) {
      return null;
    }
    return memberInfo.role;
  }, [memberInfo.role]);

  const [selectedRole, setSelectedRole] =
    React.useState<?string>(initialSelectedRole);

  const onBackClick = React.useCallback(() => {
    if (selectedRole === initialSelectedRole) {
      popModal();
      return;
    }

    pushModal(<UnsavedChangesModal />);
  }, [initialSelectedRole, popModal, pushModal, selectedRole]);

  const onSave = React.useCallback(() => {
    if (selectedRole === initialSelectedRole) {
      popModal();
      return;
    }

    const createChangeThreadMemberRolesPromise = () => {
      invariant(selectedRole, 'Expected selected role to be set');
      return callChangeThreadMemberRoles(
        threadInfo.id,
        [memberInfo.id],
        selectedRole,
      );
    };

    dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      createChangeThreadMemberRolesPromise(),
    );
    popModal();
  }, [
    callChangeThreadMemberRoles,
    dispatchActionPromise,
    initialSelectedRole,
    memberInfo.id,
    popModal,
    selectedRole,
    threadInfo.id,
  ]);

  return (
    <Modal name={modalName} onClose={popModal} size="large">
      <div className={css.roleModalDescription}>
        Members can only be assigned to one role at a time. Changing a
        member&rsquo;s role will replace their previously assigned role.
      </div>
      <div className={css.roleModalMember}>
        <div className={css.roleModalMemberAvatar}>
          <UserAvatar userID={memberInfo.id} size="large" />
        </div>
        <div className={css.roleModalMemberName}>{memberInfo.username}</div>
      </div>
      <div className={css.roleModalRoleSelector}>
        <Dropdown
          options={roleOptions}
          activeSelection={selectedRole}
          setActiveSelection={setSelectedRole}
        />
      </div>
      <div className={css.roleModalActionButtons}>
        <Button
          variant="outline"
          className={css.roleModalBackButton}
          onClick={onBackClick}
        >
          Back
        </Button>
        <Button
          variant="filled"
          className={css.roleModalSaveButton}
          buttonColor={buttonThemes.primary}
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

export default ChangeMemberRoleModal;
