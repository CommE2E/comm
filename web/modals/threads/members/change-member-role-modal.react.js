// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { RelativeMemberInfo, ThreadInfo } from 'lib/types/thread-types';
import { values } from 'lib/utils/objects.js';

import css from './change-member-role-modal.css';
import UserAvatar from '../../../avatars/user-avatar.react.js';
import Button, { buttonThemes } from '../../../components/button.react.js';
import Dropdown from '../../../components/dropdown.react.js';
import Modal from '../../modal.react.js';
import UnsavedChangesModal from '../../unsaved-changes-modal.react.js';

type ChangeMemberRoleModalProps = {
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
};

function ChangeMemberRoleModal(props: ChangeMemberRoleModalProps): React.Node {
  const { memberInfo, threadInfo } = props;
  const { pushModal, popModal } = useModalContext();

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

  const onBackClick = React.useCallback(() => {
    if (selectedRole === initialSelectedRole) {
      popModal();
      return;
    }

    pushModal(<UnsavedChangesModal />);
  }, [initialSelectedRole, popModal, pushModal, selectedRole]);

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
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

export default ChangeMemberRoleModal;
