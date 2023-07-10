// @flow

import classnames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { inviteLinkUrl } from 'lib/facts/links.js';
import { useInviteLinksActions } from 'lib/hooks/invite-links.js';
import type { InviteLink } from 'lib/types/link-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import css from './manage-invite-links-modal.css';
import Button from '../../components/button.react.js';
import Input from '../../modals/input.react.js';
import Modal from '../../modals/modal.react.js';

type Props = {
  +inviteLink: ?InviteLink,
  +enterViewMode: () => mixed,
  +community: ThreadInfo,
};

function EditLinkModal(props: Props): React.Node {
  const { inviteLink, enterViewMode, community } = props;
  const { popModal } = useModalContext();

  const { error, isLoading, name, setName, createOrUpdateInviteLink } =
    useInviteLinksActions(community.id, inviteLink);
  const onChangeName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      setName(event.currentTarget.value);
    },
    [setName],
  );

  let errorComponent = null;
  if (error) {
    errorComponent = <div className={css.errorContainer}>{error}</div>;
  }

  return (
    <Modal name="Public link" onClose={popModal} size="large">
      <div className={classnames(css.container, css.editLinkContainer)}>
        <div className={css.editLinkDescription}>
          <p>
            Invite links make it easy for your friends to join your community.
            Anybody who knows your community’s invite link will be able to join
            it.
          </p>
          <p>
            Note that if you change your public link’s URL, other communities
            will be able to claim the old URL.
          </p>
        </div>
        <hr className={css.separator} />
        <div className={css.linkSection}>
          Invite URL
          <div className={css.linkRow}>
            {inviteLinkUrl('')}
            <Input type="text" value={name} onChange={onChangeName} />
          </div>
          {errorComponent}
          <div
            className={classnames(css.buttonRow, {
              [css.buttonRowWithError]: !!error,
            })}
          >
            <Button variant="outline" onClick={enterViewMode}>
              Back
            </Button>
            <Button
              variant="filled"
              onClick={createOrUpdateInviteLink}
              disabled={isLoading}
            >
              Save & enable public link
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EditLinkModal;
