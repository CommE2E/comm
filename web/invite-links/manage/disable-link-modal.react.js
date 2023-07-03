// @flow

import classnames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useInviteLinksActions } from 'lib/hooks/invite-links.js';
import type { InviteLink } from 'lib/types/link-types.js';

import css from './manage-invite-links-modal.css';
import Button, { buttonThemes } from '../../components/button.react.js';
import Modal from '../../modals/modal.react.js';

type Props = {
  +inviteLink: InviteLink,
  +enterEditMode: () => mixed,
  +enterViewMode: () => mixed,
};

function DisableLinkModal(props: Props): React.Node {
  const { inviteLink, enterEditMode, enterViewMode } = props;
  const { popModal } = useModalContext();
  const { isLoading, disableInviteLink } = useInviteLinksActions(
    inviteLink.communityID,
    inviteLink,
  );
  const disableLink = React.useCallback(async () => {
    await disableInviteLink();
    enterViewMode();
  }, [disableInviteLink, enterViewMode]);

  return (
    <Modal name="Disable public link" onClose={popModal} size="large">
      <div className={classnames(css.container, css.editLinkContainer)}>
        <div>
          Are you sure you want to disable your public link? Members who have
          your community’s public link but have not joined will not able to with
          the disabled link.
          <br />
          <br />
          Other communities may also claim your previous public link url.
        </div>
        <div className={css.disableLinkButtons}>
          <Button
            variant="filled"
            buttonColor={buttonThemes.danger}
            disabled={isLoading}
            onClick={disableLink}
          >
            Confirm disable
          </Button>
          <Button variant="outline" onClick={enterEditMode}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DisableLinkModal;
