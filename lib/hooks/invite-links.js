// @flow

import * as React from 'react';

import { addKeyserverActionType } from '../actions/keyserver-actions.js';
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
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import { isLoggedInToKeyserver } from '../selectors/user-selectors.js';
import type { KeyserverOverride } from '../shared/invite-links.js';
import { useIsKeyserverURLValid } from '../shared/keyserver-utils.js';
import { permissionsAndAuthRelatedRequestTimeout } from '../shared/timeouts.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type { SetState } from '../types/hook-types.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';
import type {
  InviteLink,
  InviteLinkVerificationResponse,
} from '../types/link-types.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type { ThreadJoinPayload } from '../types/thread-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

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
  +isChanged: boolean,
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
      isChanged: name !== inviteLink?.name,
      name,
      setName,
      createOrUpdateInviteLink,
      disableInviteLink,
    }),
    [
      createOrUpdateInviteLink,
      disableInviteLink,
      error,
      inviteLink?.name,
      isLoading,
      name,
    ],
  );
}

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);

export type LinkStatus = 'invalid' | 'valid' | 'timed_out';

type AcceptInviteLinkParams = {
  +verificationResponse: InviteLinkVerificationResponse,
  +inviteSecret: string,
  +keyserverOverride: ?KeyserverOverride,
  +calendarQuery: () => CalendarQuery,
  +onFinish: () => mixed,
  +setLinkStatus: SetState<LinkStatus>,
};
function useAcceptInviteLink(params: AcceptInviteLinkParams): {
  +joinCommunity: () => mixed,
  +joinThreadLoadingStatus: LoadingStatus,
} {
  const {
    verificationResponse,
    inviteSecret,
    keyserverOverride,
    calendarQuery,
    onFinish,
    setLinkStatus,
  } = params;

  React.useEffect(() => {
    if (verificationResponse.status === 'already_joined') {
      onFinish();
    }
  }, [onFinish, verificationResponse.status]);

  const dispatch = useDispatch();
  const callJoinThread = useJoinThread();

  const communityID = verificationResponse.community?.id;
  let keyserverID = keyserverOverride?.keyserverID;
  if (!keyserverID && communityID) {
    keyserverID = extractKeyserverIDFromID(communityID);
  }

  const isKeyserverKnown = useSelector(state =>
    keyserverID ? !!state.keyserverStore.keyserverInfos[keyserverID] : false,
  );
  const isAuthenticated = useSelector(isLoggedInToKeyserver(keyserverID));

  const keyserverURL = keyserverOverride?.keyserverURL;
  const isKeyserverURLValid = useIsKeyserverURLValid(keyserverURL);

  const [ongoingJoinData, setOngoingJoinData] = React.useState<?{
    +resolve: ThreadJoinPayload => mixed,
    +reject: () => mixed,
    +communityID: string,
  }>(null);
  const timeoutRef = React.useRef<?TimeoutID>();

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const createJoinCommunityAction = React.useCallback(() => {
    return new Promise<ThreadJoinPayload>((resolve, reject) => {
      if (
        !keyserverID ||
        !communityID ||
        keyserverID !== extractKeyserverIDFromID(communityID)
      ) {
        reject();
        setLinkStatus('invalid');
        setOngoingJoinData(null);
        return;
      }
      const timeoutID = setTimeout(() => {
        reject();
        setOngoingJoinData(oldData => {
          if (oldData) {
            setLinkStatus('timed_out');
          }
          return null;
        });
      }, permissionsAndAuthRelatedRequestTimeout);
      timeoutRef.current = timeoutID;
      const resolveAndClearTimeout = (result: ThreadJoinPayload) => {
        clearTimeout(timeoutID);
        resolve(result);
      };
      const rejectAndClearTimeout = () => {
        clearTimeout(timeoutID);
        reject();
      };
      setOngoingJoinData({
        resolve: resolveAndClearTimeout,
        reject: rejectAndClearTimeout,
        communityID,
      });
    });
  }, [communityID, keyserverID, setLinkStatus]);

  React.useEffect(() => {
    void (async () => {
      if (!ongoingJoinData || isKeyserverKnown) {
        return;
      }
      const isValid = await isKeyserverURLValid();
      if (!isValid || !keyserverURL) {
        setLinkStatus('invalid');
        ongoingJoinData.reject();
        setOngoingJoinData(null);
        return;
      }
      dispatch({
        type: addKeyserverActionType,
        payload: {
          keyserverAdminUserID: keyserverID,
          newKeyserverInfo: defaultKeyserverInfo(keyserverURL),
        },
      });
    })();
  }, [
    dispatch,
    isKeyserverKnown,
    isKeyserverURLValid,
    ongoingJoinData,
    keyserverID,
    keyserverURL,
    setLinkStatus,
  ]);

  React.useEffect(() => {
    void (async () => {
      if (!ongoingJoinData || !isAuthenticated) {
        return;
      }
      const threadID = ongoingJoinData.communityID;
      const query = calendarQuery();

      try {
        const result = await callJoinThread({
          threadID,
          calendarQuery: {
            startDate: query.startDate,
            endDate: query.endDate,
            filters: [
              ...query.filters,
              { type: 'threads', threadIDs: [threadID] },
            ],
          },
          inviteLinkSecret: inviteSecret,
        });
        onFinish();
        ongoingJoinData.resolve(result);
      } catch (e) {
        setLinkStatus(status => (status === 'valid' ? 'invalid' : status));
        ongoingJoinData.reject();
      } finally {
        setOngoingJoinData(null);
      }
    })();
  }, [
    calendarQuery,
    callJoinThread,
    communityID,
    inviteSecret,
    isAuthenticated,
    ongoingJoinData,
    onFinish,
    setLinkStatus,
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
