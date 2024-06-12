// @flow

import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import {
  inviteLinkTexts,
  useAcceptInviteLink,
} from 'lib/hooks/invite-links.js';
import type { LinkStatus } from 'lib/hooks/invite-links.js';
import type { KeyserverOverride } from 'lib/shared/invite-links.js';
import { type InviteLinkVerificationResponse } from 'lib/types/link-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import css from './accept-invite-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors.js';

type Props = {
  +verificationResponse: InviteLinkVerificationResponse,
  +inviteSecret: string,
  +keyserverOverride?: ?KeyserverOverride,
};

function AcceptInviteModal(props: Props): React.Node {
  const { verificationResponse, inviteSecret, keyserverOverride } = props;
  const [linkStatus, setLinkStatus] = React.useState<LinkStatus>(
    verificationResponse.status === 'expired'
      ? 'invalid'
      : verificationResponse.status,
  );
  const { popModal } = useModalContext();
  const calendarQuery = useSelector(nonThreadCalendarQuery);

  const dispatch = useDispatch();
  const navigateToThread = React.useCallback(
    (threadInfo: ThreadInfo) => {
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          chatMode: 'view',
          activeChatThreadID: threadInfo.id,
          tab: 'chat',
        },
      });
      popModal();
    },
    [dispatch, popModal],
  );

  const { join, joinLoadingStatus } = useAcceptInviteLink({
    verificationResponse,
    inviteSecret,
    keyserverOverride,
    calendarQuery,
    closeModal: popModal,
    setLinkStatus,
    navigateToThread,
  });

  let content;
  if (verificationResponse.status === 'valid' && linkStatus === 'valid') {
    const { community } = verificationResponse;
    let additionalCommunityDescription = null;
    if (verificationResponse.thread) {
      additionalCommunityDescription = (
        <div className={css.group}>
          <div className={css.text}>within</div>
          <div className={css.heading}>{community.name}</div>
        </div>
      );
    }
    const targetName =
      verificationResponse.thread?.name ?? verificationResponse.community.name;
    content = (
      <>
        <div className={css.group}>
          <div className={css.text}>You have been invited to join</div>
          <div className={css.heading}>{targetName}</div>
        </div>
        {additionalCommunityDescription}
        <hr />
        <div className={css.group}>
          <Button
            variant="filled"
            buttonColor={buttonThemes.standard}
            disabled={joinLoadingStatus === 'loading'}
            onClick={join}
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
          <div className={css.heading}>
            {inviteLinkTexts[linkStatus].header}
          </div>
          <div className={css.text}>{inviteLinkTexts[linkStatus].message}</div>
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
