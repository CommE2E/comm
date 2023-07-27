// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useRoleMemberCountsForCommunity } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import css from './community-roles-modal.css';
import CreateRolesModal from './create-roles-modal.react.js';
import RolePanelEntry from './role-panel-entry.react.js';
import Button, { buttonThemes } from '../components/button.react.js';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type CommunityRolesModalProps = {
  +community: ThreadInfo,
};

function CommunityRolesModal(props: CommunityRolesModalProps): React.Node {
  const { popModal, pushModal } = useModalContext();
  const { community } = props;

  const [threadInfo, setThreadInfo] = React.useState<ThreadInfo>(community);
  const threadID = threadInfo.id;
  const reduxThreadInfo: ?ThreadInfo = useSelector(
    state => threadInfoSelector(state)[threadID],
  );

  React.useEffect(() => {
    if (reduxThreadInfo) {
      setThreadInfo(reduxThreadInfo);
    }
  }, [reduxThreadInfo]);

  const roleNamesToMembers = useRoleMemberCountsForCommunity(threadInfo);

  const rolePanelList = React.useMemo(
    () =>
      Object.keys(roleNamesToMembers).map(roleName => (
        <RolePanelEntry
          key={roleName}
          threadInfo={threadInfo}
          roleName={roleName}
          memberCount={roleNamesToMembers[roleName]}
        />
      )),
    [roleNamesToMembers, threadInfo],
  );

  const rolePermissionsForNewRole = React.useMemo(() => new Set(), []);

  const onClickCreateRole = React.useCallback(
    () =>
      pushModal(
        <CreateRolesModal
          threadInfo={threadInfo}
          action="create_role"
          roleName="New Role"
          rolePermissions={rolePermissionsForNewRole}
        />,
      ),
    [pushModal, threadInfo, rolePermissionsForNewRole],
  );

  return (
    <Modal name="Roles" onClose={popModal} size="large">
      <div className={css.modalDescription}>
        Roles help you group community members together and assign them certain
        permissions. When people join the community, they are automatically
        assigned the Members role.
      </div>
      <div className={css.modalDescription}>
        Communities must always have the Admins and Members role.
      </div>
      <div className={css.rolePanelTitleContainer}>
        <div className={css.rolePanelTitle}>Roles</div>
        <div className={css.rolePanelTitle}>Members</div>
      </div>
      <hr className={css.separator} />
      <div className={css.rolePanelList}>{rolePanelList}</div>
      <div className={css.createRoleButtonContainer}>
        <Button
          variant="filled"
          className={css.createRoleButton}
          buttonColor={buttonThemes.standard}
          onClick={onClickCreateRole}
        >
          Create Role
        </Button>
      </div>
    </Modal>
  );
}

export default CommunityRolesModal;
