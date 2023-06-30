// @flow

import React from 'react';

import {
  createOrUpdatePublicLink,
  createOrUpdatePublicLinkActionTypes,
  disableInviteLink as callDisableInviteLink,
  disableInviteLinkLinkActionTypes,
} from '../actions/link-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type { SetState } from '../types/hook-types.js';
import type { InviteLink } from '../types/link-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const createOrUpdatePublicLinkStatusSelector = createLoadingStatusSelector(
  createOrUpdatePublicLinkActionTypes,
);
const disableInviteLinkStatusSelector = createLoadingStatusSelector(
  disableInviteLinkLinkActionTypes,
);

function useInviteLinksActions(
  communityID: string,
  inviteLink: ?InviteLink,
): {
  +error: ?string,
  +isLoading: boolean,
  +name: string,
  +setName: SetState<string>,
  +createOrUpdateInviteLink: () => mixed,
  +disableInviteLink: () => mixed,
} {
  const [name, setName] = React.useState(
    inviteLink?.name ?? Math.random().toString(36).slice(-9),
  );
  const [error, setError] = React.useState(null);
  const dispatchActionPromise = useDispatchActionPromise();

  const callCreateOrUpdatePublicLink = useServerCall(createOrUpdatePublicLink);
  const createCreateOrUpdateActionPromise = React.useCallback(async () => {
    setError(null);
    try {
      return await callCreateOrUpdatePublicLink({
        name,
        communityID,
      });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [callCreateOrUpdatePublicLink, communityID, name]);
  const createInviteLink = React.useCallback(() => {
    dispatchActionPromise(
      createOrUpdatePublicLinkActionTypes,
      createCreateOrUpdateActionPromise(),
    );
  }, [createCreateOrUpdateActionPromise, dispatchActionPromise]);

  const disableInviteLinkServerCall = useServerCall(callDisableInviteLink);
  const createDisableLinkActionPromise = React.useCallback(async () => {
    setError(null);
    try {
      return await disableInviteLinkServerCall({
        name,
        communityID,
      });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [disableInviteLinkServerCall, communityID, name]);
  const disableInviteLink = React.useCallback(() => {
    dispatchActionPromise(
      disableInviteLinkLinkActionTypes,
      createDisableLinkActionPromise(),
    );
  }, [createDisableLinkActionPromise, dispatchActionPromise]);
  const disableInviteLinkStatus = useSelector(disableInviteLinkStatusSelector);

  const createOrUpdatePublicLinkStatus = useSelector(
    createOrUpdatePublicLinkStatusSelector,
  );
  const isLoading =
    createOrUpdatePublicLinkStatus === 'loading' ||
    disableInviteLinkStatus === 'loading';

  return React.useMemo(
    () => ({
      error,
      isLoading,
      name,
      setName,
      createOrUpdateInviteLink: createInviteLink,
      disableInviteLink,
    }),
    [createInviteLink, disableInviteLink, error, isLoading, name],
  );
}

export { useInviteLinksActions };
