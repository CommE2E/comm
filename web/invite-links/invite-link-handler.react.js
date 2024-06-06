// @flow

import * as React from 'react';

import {
  useVerifyInviteLink,
  verifyInviteLinkActionTypes,
} from 'lib/actions/link-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  getKeyserverOverrideForAnInviteLink,
  type KeyserverOverride,
} from 'lib/shared/invite-links.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import AcceptInviteModal from './accept-invite-modal.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

function InviteLinkHandler(): null {
  const inviteSecret = useSelector(state => state.navInfo.inviteSecret);
  const inviteLinkSecret = React.useRef<?string>(null);
  const [keyserverOverride, setKeyserverOverride] =
    React.useState<?KeyserverOverride>(undefined);
  const loggedIn = useSelector(isLoggedIn);

  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();
  const { pushModal } = useModalContext();
  React.useEffect(() => {
    void (async () => {
      if (!inviteSecret || !loggedIn) {
        return;
      }
      dispatch({
        type: updateNavInfoActionType,
        payload: { inviteSecret: null },
      });
      setKeyserverOverride(undefined);
      inviteLinkSecret.current = inviteSecret;

      try {
        const newKeyserverOverride =
          await getKeyserverOverrideForAnInviteLink(inviteSecret);
        setKeyserverOverride(newKeyserverOverride);
      } catch (e) {
        console.error('Error while downloading an invite link blob', e);
        pushModal(
          <AcceptInviteModal
            verificationResponse={{
              status: 'invalid',
            }}
            inviteSecret={inviteSecret}
          />,
        );
      }
    })();
  }, [dispatch, inviteSecret, loggedIn, pushModal]);

  const validateLink = useVerifyInviteLink(keyserverOverride);
  const threadInfos = useSelector(threadInfoSelector);
  React.useEffect(() => {
    const secret = inviteLinkSecret.current;
    if (keyserverOverride === undefined || !secret) {
      return;
    }
    setKeyserverOverride(undefined);

    void (async () => {
      let result;
      try {
        const validateLinkPromise = validateLink({ secret });
        void dispatchActionPromise(
          verifyInviteLinkActionTypes,
          validateLinkPromise,
        );

        result = await validateLinkPromise;
      } catch (e) {
        console.error('Error while verifying an invite link', e);
        result = {
          status: 'invalid',
        };
      }

      const communityID = result.community?.id;
      if (
        communityID &&
        result.status === 'already_joined' &&
        threadInfos[communityID]
      ) {
        dispatch({
          type: updateNavInfoActionType,
          payload: {
            chatMode: 'view',
            activeChatThreadID: communityID,
            tab: 'chat',
          },
        });
      }

      pushModal(
        <AcceptInviteModal
          verificationResponse={result}
          inviteSecret={secret}
          keyserverOverride={keyserverOverride}
        />,
      );
    })();
  }, [
    dispatch,
    dispatchActionPromise,
    keyserverOverride,
    pushModal,
    threadInfos,
    validateLink,
  ]);

  return null;
}

export default InviteLinkHandler;
