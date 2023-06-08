// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  changeThreadMemberRoles,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors.js';
import { roleIsAdminRole } from 'lib/shared/thread-utils.js';
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
import { useSelector } from '../../../redux/redux-utils.js';
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
  const [showErrorMessage, setShowErrorMessage] = React.useState(false);
  const otherUsersButNoOtherAdminsValue = useSelector(
    otherUsersButNoOtherAdmins(threadInfo.id),
  );

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

  const errorMessage = React.useMemo(() => {
    if (!showErrorMessage) {
      return null;
    }

    return (
      <>
        <div className={css.roleModalErrorMessage}>Cannot change role.</div>
        <div className={css.roleModalErrorMessage}>
          There must be at least one admin at any given time.
        </div>
      </>
    );
  }, [showErrorMessage]);

  const onSave = React.useCallback(() => {
    if (selectedRole === initialSelectedRole) {
      popModal();
      return;
    }

    const memberIsAdmin = memberInfo.role
      ? roleIsAdminRole(threadInfo.roles[memberInfo.role])
      : true;

    // Handle case where the sole admin's role is being changed.
    if (otherUsersButNoOtherAdminsValue && memberIsAdmin) {
      setShowErrorMessage(true);
      return;
    }

    setShowErrorMessage(false);

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
    otherUsersButNoOtherAdminsValue,
    dispatchActionPromise,
    initialSelectedRole,
    memberInfo,
    popModal,
    selectedRole,
    threadInfo,
  ]);

  return (
    <Modal name="Change Role" onClose={popModal} size="large">
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
      {errorMessage}
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
