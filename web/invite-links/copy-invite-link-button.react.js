// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { inviteLinkURL } from 'lib/facts/links.js';
import { useResettingState } from 'lib/hooks/use-resetting-state.js';
import type { InviteLink } from 'lib/types/link-types.js';

import css from './copy-invite-link-button.css';
import Button from '../components/button.react.js';

type Props = {
  +inviteLink: InviteLink,
};

const copiedMessageDurationMs = 2000;
function CopyInviteLinkButton(props: Props): React.Node {
  const { inviteLink } = props;
  const url = inviteLinkURL(inviteLink.name);
  const [copied, setCopied] = useResettingState(false, copiedMessageDurationMs);
  const copyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (e) {
      setCopied(false);
    }
  }, [setCopied, url]);
  const buttonText = copied ? 'Copied!' : 'Copy';

  return (
    <div className={css.linkContainer}>
      <div className={css.linkUrl}>{url}</div>
      <Button className={css.linkCopyButton} onClick={copyLink}>
        <SWMansionIcon icon="link" size={24} />
        {buttonText}
      </Button>
    </div>
  );
}

export default CopyInviteLinkButton;
