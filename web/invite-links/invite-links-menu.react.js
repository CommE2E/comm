// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import type { InviteLink } from 'lib/types/link-types.js';

import css from './invite-links-menu.css';
import ViewInviteLinkModal from './view-invite-link-modal.react.js';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +communityID: string,
};

function InviteLinksMenu(props: Props): React.Node {
  const { communityID } = props;
  const inviteLink: ?InviteLink = useSelector(primaryInviteLinksSelector)[
    communityID
  ];
  const { pushModal } = useModalContext();

  const openViewInviteLinkModal = React.useCallback(() => {
    if (!inviteLink) {
      return;
    }
    pushModal(<ViewInviteLinkModal inviteLink={inviteLink} />);
  }, [inviteLink, pushModal]);

  if (!inviteLink) {
    return null;
  }

  const icon = <SWMansionIcon icon="menu-vertical" size={24} />;
  return (
    <div className={css.container}>
      <Menu icon={icon} variant="community-actions">
        <MenuItem
          text="Invite Link"
          icon="link"
          onClick={openViewInviteLinkModal}
        />
      </Menu>
    </div>
  );
}

export default InviteLinksMenu;
