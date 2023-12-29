// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { primaryInviteLinksSelector } from 'lib/selectors/invite-links-selectors.js';
import type { InviteLink } from 'lib/types/link-types.js';

import css from './community-header-actions.css';
import CommunityHeaderButton from './community-header-button.react.js';
import ViewInviteLinkModal from '../invite-links/view-invite-link-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +communityID: string,
};

function CommunityHeaderActions(props: Props): React.Node {
  const { communityID } = props;

  const { pushModal } = useModalContext();

  const inviteLink: ?InviteLink = useSelector(primaryInviteLinksSelector)[
    communityID
  ];

  const onClickLinkButton = React.useCallback(() => {
    if (!inviteLink) {
      return;
    }

    pushModal(<ViewInviteLinkModal inviteLink={inviteLink} />);
  }, [inviteLink, pushModal]);

  const onClickSettings = React.useCallback(() => {
    // TODO
  }, []);

  const linkButton = React.useMemo(() => {
    if (!inviteLink) {
      return null;
    }

    return (
      <CommunityHeaderButton
        icon="link"
        label="Invite link"
        onClick={onClickLinkButton}
      />
    );
  }, [inviteLink, onClickLinkButton]);

  const communityHeaderActions = React.useMemo(
    () => (
      <div className={css.container}>
        {linkButton}
        <CommunityHeaderButton
          icon="settings"
          label="Settings"
          onClick={onClickSettings}
        />
      </div>
    ),
    [linkButton, onClickSettings],
  );

  return communityHeaderActions;
}

export default CommunityHeaderActions;
