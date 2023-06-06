// @flow

import * as React from 'react';

import type { RelativeMemberInfo, ThreadInfo } from 'lib/types/thread-types';

import css from './change-member-role-modal.css';
import UserAvatar from '../../../components/user-avatar.react.js';
import Modal from '../../modal.react.js';

type ChangeMemberRoleModalProps = {
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
};

function ChangeMemberRoleModal(props: ChangeMemberRoleModalProps): React.Node {
  const { memberInfo } = props;
  const modalName = 'Change Role';

  return (
    <Modal name={modalName} onClose={() => {}} size="large">
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
    </Modal>
  );
}

export default ChangeMemberRoleModal;
