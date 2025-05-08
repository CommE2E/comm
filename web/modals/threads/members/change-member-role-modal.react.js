// @flow

import invariant from 'invariant';
import * as React from 'react';

import { changeThreadMemberRolesActionTypes } from 'lib/actions/thread-action-types.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useChangeThreadMemberRoles } from 'lib/hooks/thread-hooks.js';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors.js';
import { roleIsAdminRole } from 'lib/shared/thread-utils.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { values } from 'lib/utils/objects.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './change-member-role-modal.css';
import UserAvatar from '../../../avatars/user-avatar.react.js';
import Button, { buttonThemes } from '../../../components/button.react.js';
import Dropdown from '../../../components/dropdown.react.js';
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
  const callChangeThreadMemberRoles = useChangeThreadMemberRoles();
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

  const initialSelectedRole = memberInfo.role;
  invariant(initialSelectedRole, "Member's role must be defined");

  const [selectedRole, setSelectedRole] = React.useState(initialSelectedRole);

  const onCloseModal = React.useCallback(() => {
    if (selectedRole === initialSelectedRole) {
      popModal();
      return;
    }

    pushModal(<UnsavedChangesModal />);
  }, [initialSelectedRole, popModal, pushModal, selectedRole]);

  const disabledRoleChangeMessage = React.useMemo(() => {
    const memberIsAdmin = roleIsAdminRole(
      threadInfo.roles[initialSelectedRole],
    );

    if (!otherUsersButNoOtherAdminsValue || !memberIsAdmin) {
      return null;
    }

    return (
      <div className={css.roleModalDisabled}>
        <SWMansionIcon icon="info-circle" size={36} className={css.infoIcon} />
        <div className={css.infoText}>
          There must be at least one admin at any given time in a community.
        </div>
      </div>
    );
  }, [initialSelectedRole, otherUsersButNoOtherAdminsValue, threadInfo.roles]);

  const onSave = React.useCallback(() => {
    if (selectedRole === initialSelectedRole) {
      popModal();
      return;
    }

    const createChangeThreadMemberRolesPromise = () =>
      callChangeThreadMemberRoles({
        threadID: threadInfo.id,
        memberIDs: [memberInfo.id],
        newRole: selectedRole,
      });

    void dispatchActionPromise(
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

  const primaryButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        className={css.roleModalSaveButton}
        buttonColor={buttonThemes.primary}
        onClick={onSave}
        disabled={!!disabledRoleChangeMessage}
      >
        Save
      </Button>
    ),
    [disabledRoleChangeMessage, onSave],
  );

  const secondaryButton = React.useMemo(
    () => (
      <Button
        variant="outline"
        className={css.roleModalBackButton}
        onClick={onCloseModal}
      >
        Back
      </Button>
    ),
    [onCloseModal],
  );

  return (
    <Modal
      name="Change Role"
      onClose={onCloseModal}
      size="large"
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    >
      <div className={css.roleModalDescription}>
        Members can only be assigned to one role at a time. Changing a
        member&rsquo;s role will replace their previously assigned role.
      </div>
      <div className={css.roleModalMember}>
        <div className={css.roleModalMemberAvatar}>
          <UserAvatar userID={memberInfo.id} size="M" />
        </div>
        <div className={css.roleModalMemberName}>{memberInfo.username}</div>
      </div>
      <div className={css.roleModalRoleSelector}>
        <Dropdown
          options={roleOptions}
          activeSelection={selectedRole}
          setActiveSelection={setSelectedRole}
          disabled={!!disabledRoleChangeMessage}
        />
      </div>
      {disabledRoleChangeMessage}
    </Modal>
  );
}

export default ChangeMemberRoleModal;
