// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  useCreateOrUpdatePublicLink,
  createOrUpdatePublicLinkActionTypes,
  useDisableInviteLink,
  disableInviteLinkLinkActionTypes,
} from '../actions/link-actions.js';
import {
  joinThreadActionTypes,
  useJoinThread,
} from '../actions/thread-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type { SetState } from '../types/hook-types.js';
import type {
  InviteLink,
  InviteLinkVerificationResponse,
} from '../types/link-types.js';
import type { LoadingStatus } from '../types/loading-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
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

  const callCreateOrUpdatePublicLink = useCreateOrUpdatePublicLink();
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
  const createOrUpdateInviteLink = React.useCallback(() => {
    void dispatchActionPromise(
      createOrUpdatePublicLinkActionTypes,
      createCreateOrUpdateActionPromise(),
    );
  }, [createCreateOrUpdateActionPromise, dispatchActionPromise]);

  const disableInviteLinkServerCall = useDisableInviteLink();
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
    void dispatchActionPromise(
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
      createOrUpdateInviteLink,
      disableInviteLink,
    }),
    [createOrUpdateInviteLink, disableInviteLink, error, isLoading, name],
  );
}

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);

type AcceptInviteLinkParams = {
  +verificationResponse: InviteLinkVerificationResponse,
  +inviteSecret: string,
  +calendarQuery: () => CalendarQuery,
  +onFinish: () => mixed,
  +onInvalidLinkDetected: () => mixed,
};
function useAcceptInviteLink(params: AcceptInviteLinkParams): {
  +joinCommunity: () => mixed,
  +joinThreadLoadingStatus: LoadingStatus,
} {
  const {
    verificationResponse,
    inviteSecret,
    calendarQuery,
    onFinish,
    onInvalidLinkDetected,
  } = params;

  React.useEffect(() => {
    if (verificationResponse.status === 'already_joined') {
      onFinish();
    }
  }, [onFinish, verificationResponse.status]);

  const callJoinThread = useJoinThread();
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
      onFinish();
      return result;
    } catch (e) {
      onInvalidLinkDetected();
      throw e;
    }
  }, [
    calendarQuery,
    callJoinThread,
    communityID,
    inviteSecret,
    onFinish,
    onInvalidLinkDetected,
  ]);
  const dispatchActionPromise = useDispatchActionPromise();
  const joinCommunity = React.useCallback(() => {
    void dispatchActionPromise(
      joinThreadActionTypes,
      createJoinCommunityAction(),
    );
  }, [createJoinCommunityAction, dispatchActionPromise]);

  const joinThreadLoadingStatus = useSelector(joinThreadLoadingStatusSelector);

  return React.useMemo(
    () => ({
      joinCommunity,
      joinThreadLoadingStatus,
    }),
    [joinCommunity, joinThreadLoadingStatus],
  );
}

export { useInviteLinksActions, useAcceptInviteLink };
