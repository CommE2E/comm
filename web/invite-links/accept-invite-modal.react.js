// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  joinThread,
  joinThreadActionTypes,
} from 'lib/actions/thread-actions.js';
import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { type InviteLinkVerificationResponse } from 'lib/types/link-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

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
  const { popModal } = useModalContext();

  React.useEffect(() => {
    if (verificationResponse.status === 'already_joined') {
      popModal();
    }
  }, [popModal, verificationResponse.status]);

  const callJoinThread = useServerCall(joinThread);
  const calendarQuery = useSelector(nonThreadCalendarQuery);
  const communityID = verificationResponse.community?.id;
  const createJoinCommunityAction = React.useCallback(async () => {
    invariant(
      communityID,
      'CommunityID should be present while calling this function',
    );
    const query = calendarQuery();
    try {
      const result = await callJoinThread({
        threadID: communityID,
        calendarQuery: {
          startDate: query.startDate,
          endDate: query.endDate,
          filters: [
            ...query.filters,
            { type: 'threads', threadIDs: [communityID] },
          ],
        },
        inviteLinkSecret: inviteSecret,
      });
      popModal();
      return result;
    } catch (e) {
      setIsLinkValid(false);
      throw e;
    }
  }, [calendarQuery, callJoinThread, communityID, inviteSecret, popModal]);
  const dispatchActionPromise = useDispatchActionPromise();
  const joinCommunity = React.useCallback(() => {
    dispatchActionPromise(joinThreadActionTypes, createJoinCommunityAction());
  }, [createJoinCommunityAction, dispatchActionPromise]);
  const joinThreadLoadingStatus = useSelector(joinThreadLoadingStatusSelector);

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
            invite link
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

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);

export default AcceptInviteModal;
