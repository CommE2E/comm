// @flow

import * as React from 'react';

import type { InviteLink } from 'lib/types/link-types.js';

import css from './manage-invite-links-modal.css';
import Button from '../../components/button.react.js';
import CopyInviteLinkButton from '../copy-invite-link-button.react.js';

const buttonColor = {
  color: 'var(--purple-link)',
};

type Props = {
  +inviteLink: InviteLink,
  +enterEditMode: () => mixed,
};
function ExistingLinkContent(props: Props): React.Node {
  const { inviteLink, enterEditMode } = props;
  return (
    <>
      <div className={css.sectionHeaderRow}>
        <div className={css.sectionHeaderText}>Public link</div>
      </div>
      <div>
        <CopyInviteLinkButton inviteLink={inviteLink} />
        <div className={css.description}>
          {'Public links allow unlimited uses and never expire. '}
          <Button
            variant="text"
            buttonColor={buttonColor}
            className={css.inlineButton}
            onClick={enterEditMode}
          >
            Edit public link
          </Button>
        </div>
      </div>
    </>
  );
}

export default ExistingLinkContent;
