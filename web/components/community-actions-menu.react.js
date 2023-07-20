// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { threadHasPermission } from 'lib/shared/thread-utils.js';
import type { InviteLink } from 'lib/types/link-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';

import css from './community-actions-menu.css';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import ManageInviteLinksModal from '../invite-links/manage-invite-links-modal.react.js';
import ViewInviteLinkModal from '../invite-links/view-invite-link-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';
import CommunityRolesModal from '../roles/community-roles-modal.react.js';
import { AddLink } from '../vectors.react.js';

type Props = {
  +communityID: string,
};

function CommunityActionsMenu(props: Props): React.Node {
  const { communityID } = props;
  const inviteLink: ?InviteLink = useSelector(primaryInviteLinksSelector)[
    communityID
  ];
  const { pushModal } = useModalContext();

  const community = useSelector(
    state => threadInfoSelector(state)[communityID],
  );
  const canManageLinks = threadHasPermission(
    community,
    threadPermissions.MANAGE_INVITE_LINKS,
  );
  const canChangeRoles = threadHasPermission(
    community,
    threadPermissions.CHANGE_ROLE,
  );

  const openViewInviteLinkModal = React.useCallback(() => {
    if (!inviteLink) {
      return;
    }
    pushModal(<ViewInviteLinkModal inviteLink={inviteLink} />);
  }, [inviteLink, pushModal]);

  const openManageInviteLinksModal = React.useCallback(() => {
    pushModal(<ManageInviteLinksModal communityID={communityID} />);
  }, [communityID, pushModal]);

  const openCommunityRolesModal = React.useCallback(
    () => pushModal(<CommunityRolesModal threadInfo={community} />),
    [community, pushModal],
  );

  const items = React.useMemo(() => {
    const itemSpecs = [];

    if (canManageLinks) {
      itemSpecs.push({
        text: 'Manage invite links',
        iconComponent: <AddLink />,
        onClick: openManageInviteLinksModal,
      });
    }

    if (inviteLink) {
      itemSpecs.push({
        text: 'Invite link',
        icon: 'link',
        onClick: openViewInviteLinkModal,
      });
    }

    if (canChangeRoles) {
      itemSpecs.push({
        text: 'Roles',
        icon: 'user-info',
        onClick: openCommunityRolesModal,
      });
    }

    return itemSpecs;
  }, [
    canManageLinks,
    inviteLink,
    openManageInviteLinksModal,
    openViewInviteLinkModal,
    canChangeRoles,
    openCommunityRolesModal,
  ]);

  const menuItems = React.useMemo(
    () =>
      items.map(item => {
        if (item.icon) {
          return (
            <MenuItem
              key={item.text}
              text={item.text}
              icon={item.icon}
              onClick={item.onClick}
            />
          );
        }
        return (
          <MenuItem
            key={item.text}
            text={item.text}
            iconComponent={item.iconComponent}
            onClick={item.onClick}
          />
        );
      }),
    [items],
  );

  const icon = <SWMansionIcon icon="menu-vertical" size={24} />;
  return (
    <div className={css.container}>
      <Menu icon={icon} variant="community-actions">
        {menuItems}
      </Menu>
    </div>
  );
}

export default CommunityActionsMenu;
