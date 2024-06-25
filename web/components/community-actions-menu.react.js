// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useCanManageFarcasterChannelTag } from 'lib/shared/community-utils.js';
import { useThreadHasPermission } from 'lib/shared/thread-utils.js';
import type { InviteLink } from 'lib/types/link-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';

import css from './community-actions-menu.css';
import MenuItem from '../components/menu-item.react.js';
import type { MenuItemProps } from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import ManageInviteLinksModal from '../invite-links/manage-invite-links-modal.react.js';
import ViewInviteLinkModal from '../invite-links/view-invite-link-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';
import CommunityRolesModal from '../roles/community-roles-modal.react.js';
import TagFarcasterChannelModal from '../tag-farcaster-channel/tag-farcaster-channel-modal.react.js';
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
  const canManageLinks = useThreadHasPermission(
    community,
    threadPermissions.MANAGE_INVITE_LINKS,
  );
  const canChangeRoles = useThreadHasPermission(
    community,
    threadPermissions.CHANGE_ROLE,
  );
  const canManageFarcasterChannelTag =
    useCanManageFarcasterChannelTag(community);

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
    () => pushModal(<CommunityRolesModal community={community} />),
    [community, pushModal],
  );
  const openFarcasterChannelTagModal = React.useCallback(
    () => pushModal(<TagFarcasterChannelModal communityID={communityID} />),
    [communityID, pushModal],
  );

  const items = React.useMemo(() => {
    const itemSpecs: MenuItemProps[] = [];

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

    if (canManageFarcasterChannelTag) {
      itemSpecs.push({
        text: 'Tag Farcaster channel',
        icon: 'tag',
        onClick: openFarcasterChannelTagModal,
      });
    }

    return itemSpecs;
  }, [
    canManageLinks,
    inviteLink,
    canChangeRoles,
    canManageFarcasterChannelTag,
    openManageInviteLinksModal,
    openViewInviteLinkModal,
    openCommunityRolesModal,
    openFarcasterChannelTagModal,
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
