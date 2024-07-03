// @flow

import invariant from 'invariant';
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
import { threadInfoSelector } from '../selectors/thread-selectors.js';
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
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
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

export type LinkStatus = 'invalid' | 'valid' | 'timed_out' | 'already_joined';

const inviteLinkTexts: {
  +[LinkStatus]: {
    +header: string,
    +message: (isThreadLink: boolean) => string,
  },
} = {
  invalid: {
    header: 'Invite invalid',
    message: () =>
      'This invite link may be expired. Please try again with another invite' +
      ' link.',
  },
  ['timed_out']: {
    header: 'Timeout',
    message: () => 'The request has timed out.',
  },
  ['already_joined']: {
    header: 'Already a member',
    message: isThreadLink =>
      `You are already a member of this ${
        isThreadLink ? 'thread' : 'community'
      }.`,
  },
};

type AcceptInviteLinkParams = {
  +verificationResponse: InviteLinkVerificationResponse,
  +inviteSecret: string,
  +keyserverOverride: ?KeyserverOverride,
  +calendarQuery: () => CalendarQuery,
  +closeModal: () => mixed,
  +linkStatus: LinkStatus,
  +setLinkStatus: SetState<LinkStatus>,
  +navigateToThread: ThreadInfo => mixed,
};
function useAcceptInviteLink(params: AcceptInviteLinkParams): {
  +join: () => mixed,
  +joinLoadingStatus: LoadingStatus,
} {
  const {
    verificationResponse,
    inviteSecret,
    keyserverOverride,
    calendarQuery,
    closeModal,
    linkStatus,
    setLinkStatus,
    navigateToThread,
  } = params;

  const dispatch = useDispatch();
  const callJoinThread = useJoinThread();

  const communityID = verificationResponse.community?.id;
  let keyserverID = keyserverOverride?.keyserverID;
  if (!keyserverID && communityID) {
    const optionalKeyserverID = extractKeyserverIDFromID(communityID);
    invariant(optionalKeyserverID, 'Keyserver ID should be present');
    keyserverID = optionalKeyserverID;
  }

  const isKeyserverKnown = useSelector(state =>
    keyserverID ? !!state.keyserverStore.keyserverInfos[keyserverID] : false,
  );
  const isAuthenticated = useSelector(isLoggedInToKeyserver(keyserverID));

  const keyserverURL = keyserverOverride?.keyserverURL;
  const isKeyserverURLValid = useIsKeyserverURLValid(keyserverURL);

  const [ongoingJoinData, setOngoingJoinData] = React.useState<?{
    +resolve: () => mixed,
    +reject: () => mixed,
    +communityID: string,
    +threadID: ?string,
  }>(null);
  const timeoutRef = React.useRef<?TimeoutID>();

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  const [step, setStep] = React.useState<
    | 'inactive'
    | 'add_keyserver'
    | 'auth_to_keyserver'
    | 'join_community'
    | 'join_thread'
    | 'finished',
  >('inactive');

  const createJoinPromise = React.useCallback(() => {
    return new Promise<void>((resolve, reject) => {
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
      const resolveAndClearTimeout = () => {
        clearTimeout(timeoutID);
        resolve();
      };
      const rejectAndClearTimeout = () => {
        clearTimeout(timeoutID);
        reject();
      };
      setOngoingJoinData({
        resolve: resolveAndClearTimeout,
        reject: rejectAndClearTimeout,
        communityID,
        threadID: verificationResponse.thread?.id,
      });
      setStep('add_keyserver');
    });
  }, [
    communityID,
    keyserverID,
    setLinkStatus,
    verificationResponse.thread?.id,
  ]);

  React.useEffect(() => {
    void (async () => {
      if (!ongoingJoinData || step !== 'add_keyserver') {
        return;
      }
      if (isKeyserverKnown) {
        setStep('auth_to_keyserver');
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
    keyserverID,
    keyserverURL,
    ongoingJoinData,
    setLinkStatus,
    step,
  ]);

  React.useEffect(() => {
    if (step === 'auth_to_keyserver' && ongoingJoinData && isAuthenticated) {
      setStep('join_community');
    }
  }, [isAuthenticated, ongoingJoinData, step]);

  const dispatchActionPromise = useDispatchActionPromise();
  React.useEffect(() => {
    void (async () => {
      if (!ongoingJoinData || step !== 'join_community') {
        return;
      }
      const threadID = ongoingJoinData.communityID;
      const query = calendarQuery();
      const joinThreadPromise = callJoinThread({
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
      void dispatchActionPromise(joinThreadActionTypes, joinThreadPromise);

      try {
        await joinThreadPromise;
        setStep('join_thread');
      } catch (e) {
        setLinkStatus(status => (status === 'valid' ? 'invalid' : status));
        ongoingJoinData.reject();
        setOngoingJoinData(null);
      }
    })();
  }, [
    calendarQuery,
    callJoinThread,
    dispatchActionPromise,
    inviteSecret,
    ongoingJoinData,
    setLinkStatus,
    step,
  ]);

  React.useEffect(() => {
    void (async () => {
      if (!ongoingJoinData || step !== 'join_thread') {
        return;
      }
      const threadID = ongoingJoinData.threadID;
      if (!threadID) {
        setStep('finished');
        ongoingJoinData.resolve();
        setOngoingJoinData(null);
        return;
      }

      const query = calendarQuery();
      const joinThreadPromise = callJoinThread({
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
      void dispatchActionPromise(joinThreadActionTypes, joinThreadPromise);

      try {
        await joinThreadPromise;
        setStep('finished');
        ongoingJoinData.resolve();
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
    dispatchActionPromise,
    inviteSecret,
    ongoingJoinData,
    setLinkStatus,
    step,
  ]);

  const threadInfos = useSelector(threadInfoSelector);
  React.useEffect(() => {
    if (step !== 'finished') {
      return;
    }
    const joinedThreadID = verificationResponse.thread?.id;
    if (joinedThreadID && threadInfos[joinedThreadID]) {
      navigateToThread(threadInfos[joinedThreadID]);
      return;
    }
    const joinedCommunityID = verificationResponse.community?.id;
    if (!joinedCommunityID || !threadInfos[joinedCommunityID]) {
      closeModal();
      return;
    }
    navigateToThread(threadInfos[joinedCommunityID]);
  }, [
    closeModal,
    navigateToThread,
    step,
    threadInfos,
    verificationResponse.community?.id,
    verificationResponse.thread?.id,
  ]);

  let joinLoadingStatus: LoadingStatus = 'inactive';
  if (linkStatus === 'invalid' || linkStatus === 'timed_out') {
    joinLoadingStatus = 'error';
  } else if (step !== 'inactive' && step !== 'finished') {
    joinLoadingStatus = 'loading';
  }

  return React.useMemo(
    () => ({
      join: createJoinPromise,
      joinLoadingStatus,
    }),
    [createJoinPromise, joinLoadingStatus],
  );
}

export { useInviteLinksActions, useAcceptInviteLink, inviteLinkTexts };
