// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  verifyInviteLink,
  verifyInviteLinkActionTypes,
} from 'lib/actions/link-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import AcceptInviteModal from './accept-invite-modal.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

function InviteLinkHandler(): null {
  const inviteSecret = useSelector(state => state.navInfo.inviteSecret);
  const loggedIn = useSelector(isLoggedIn);

  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();
  const validateLink = useServerCall(verifyInviteLink);
  const { pushModal } = useModalContext();
  React.useEffect(() => {
    if (!inviteSecret || !loggedIn) {
      return;
    }
    dispatch({
      type: updateNavInfoActionType,
      payload: { inviteSecret: null },
    });
    const validateLinkPromise = validateLink({ secret: inviteSecret });
    dispatchActionPromise(verifyInviteLinkActionTypes, validateLinkPromise);
    (async () => {
      const result = await validateLinkPromise;
      if (result.status === 'already_joined') {
        return;
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
