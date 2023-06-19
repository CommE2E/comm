// @flow

import * as React from 'react';

import {
  fetchPrimaryInviteLinkActionTypes,
  fetchPrimaryInviteLinks,
} from 'lib/actions/link-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import { useSelector } from '../redux/redux-utils.js';

function InviteLinksRefresher(): React.Node {
  const isActive = useSelector(state => state.windowActive);
  const loggedIn = useSelector(isLoggedIn);
  const callFetchPrimaryLinks = useServerCall(fetchPrimaryInviteLinks);
  const dispatchActionPromise = useDispatchActionPromise();

  React.useEffect(() => {
    if (!isActive || !loggedIn) {
      return;
    }
    dispatchActionPromise(
      fetchPrimaryInviteLinkActionTypes,
      callFetchPrimaryLinks(),
    );
  }, [callFetchPrimaryLinks, dispatchActionPromise, isActive, loggedIn]);

  return null;
}

export default InviteLinksRefresher;
