// @flow

import * as React from 'react';

import {
  useVerifyInviteLink,
  verifyInviteLinkActionTypes,
} from 'lib/actions/link-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { getKeyserverOverrideForAnInviteLink } from 'lib/shared/invite-links.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import AcceptInviteModal from './accept-invite-modal.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

function InviteLinkHandler(): null {
  const inviteSecret = useSelector(state => state.navInfo.inviteSecret);
  const loggedIn = useSelector(isLoggedIn);

  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();
  const validateLink = useVerifyInviteLink();
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

      let result;
      try {
        const keyserverOverride =
          await getKeyserverOverrideForAnInviteLink(inviteSecret);
        const validateLinkPromise = validateLink(
          { secret: inviteSecret },
          keyserverOverride,
        );
        void dispatchActionPromise(
          verifyInviteLinkActionTypes,
          validateLinkPromise,
        );

        result = await validateLinkPromise;
        if (result.status === 'already_joined') {
          return;
        }
      } catch (e) {
        console.error(e);
        result = {
          status: 'invalid',
        };
      }

      pushModal(
        <AcceptInviteModal
          verificationResponse={result}
          inviteSecret={inviteSecret}
        />,
      );
    })();
  }, [
    dispatch,
    dispatchActionPromise,
    inviteSecret,
    loggedIn,
    pushModal,
    validateLink,
  ]);

  return null;
}

export default InviteLinkHandler;
