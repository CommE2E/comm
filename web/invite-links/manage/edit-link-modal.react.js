// @flow

import classnames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { inviteLinkUrl } from 'lib/facts/links.js';
import type { InviteLink } from 'lib/types/link-types.js';

import css from './manage-invite-links-modal.css';
import Button from '../../components/button.react.js';
import Input from '../../modals/input.react.js';
import Modal from '../../modals/modal.react.js';

type Props = {
  +inviteLink: ?InviteLink,
  +enterViewMode: () => mixed,
};

function EditLinkModal(props: Props): React.Node {
  const { inviteLink, enterViewMode } = props;
  const [name, setName] = React.useState(
    inviteLink?.name ?? Math.random().toString(36).slice(-9),
  );
  const { popModal } = useModalContext();

  const onChangeName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      setName(event.currentTarget.value);
    },
    [],
  );

  return (
    <Modal name="Public link" onClose={popModal} size="large">
      <div className={classnames(css.container, css.editLinkContainer)}>
        <div className={css.editLinkDescription}>
          Let your community be more accessible with your own unique public
          link. By enabling a public link, you are allowing anyone who has your
          link to join your community.
          <br />
          <br />
          Editing your community’s public link allows other communities to claim
          your previous URL.
        </div>
        <hr className={css.separator} />
        <div className={css.linkSection}>
          Invite URL
          <div className={css.linkRow}>
            {inviteLinkUrl('')}
            <Input type="text" value={name} onChange={onChangeName} />
          </div>
        </div>
        <div className={css.buttonRow}>
          <Button variant="outline" onClick={enterViewMode}>
            Back
          </Button>
          <Button variant="filled">Save & enable public link</Button>
        </div>
      </div>
    </Modal>
  );
}

export default EditLinkModal;
