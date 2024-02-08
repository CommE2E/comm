// @flow

import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useAcceptInviteLink } from 'lib/hooks/invite-links.js';
import { type InviteLinkVerificationResponse } from 'lib/types/link-types.js';

import css from './accept-invite-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors.js';

type Props = {
  +verificationResponse: InviteLinkVerificationResponse,
  +inviteSecret: string,
};

function AcceptInviteModal(props: Props): React.Node {
  const { verificationResponse, inviteSecret } = props;
  const [isLinkValid, setIsLinkValid] = React.useState(
    verificationResponse.status === 'valid',
  );
  const onInvalidLinkDetected = React.useCallback(
    () => setIsLinkValid(false),
    [],
  );
  const { popModal } = useModalContext();
  const calendarQuery = useSelector(nonThreadCalendarQuery);

  const { joinCommunity, joinThreadLoadingStatus } = useAcceptInviteLink({
    verificationResponse,
    inviteSecret,
    calendarQuery,
    onFinish: popModal,
    onInvalidLinkDetected,
  });

  let content;
  if (verificationResponse.status === 'valid' && isLinkValid) {
    const { community } = verificationResponse;
    content = (
      <>
        <div className={css.text}>You have been invited to join</div>
        <div className={css.heading}>{community.name}</div>
        <hr />
        <div className={css.group}>
          <Button
            variant="filled"
            buttonColor={buttonThemes.standard}
            disabled={joinThreadLoadingStatus === 'loading'}
            onClick={joinCommunity}
          >
            Accept invite
          </Button>
          <Button variant="outline" onClick={popModal}>
            Cancel
          </Button>
        </div>
      </>
    );
  } else {
    content = (
      <>
        <div className={css.group}>
          <div className={css.heading}>Invite invalid</div>
          <div className={css.text}>
            This invite link may be expired. Please try again with another
            invite link.
          </div>
        </div>
        <hr />
        <Button
          variant="filled"
          buttonColor={buttonThemes.standard}
          onClick={popModal}
        >
          Return to Comm
        </Button>
      </>
    );
  }

  return (
    <ModalOverlay onClose={popModal}>
      <div className={css.container}>{content}</div>
    </ModalOverlay>
  );
}

export default AcceptInviteModal;
