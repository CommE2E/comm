// @flow

import * as React from 'react';

import {
  useCreateOrUpdatePublicLink,
  createOrUpdatePublicLinkActionTypes,
  useDisableInviteLink,
  disableInviteLinkLinkActionTypes,
} from '../actions/link-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import { useJoinCommunity } from '../shared/community-utils.js';
import type { KeyserverOverride } from '../shared/invite-links.js';
import type {
  OngoingJoinCommunityData,
  JoinCommunityStep,
} from '../types/community-types.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type { SetState } from '../types/hook-types.js';
import type {
  InviteLink,
  InviteLinkVerificationResponse,
} from '../types/link-types.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
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

  const communityID = verificationResponse.community?.id;
  let keyserverID = keyserverOverride?.keyserverID;
  if (!keyserverID && communityID) {
    keyserverID = extractKeyserverIDFromID(communityID);
  }

  const [ongoingJoinData, setOngoingJoinData] =
    React.useState<?OngoingJoinCommunityData>(null);

  const [step, setStep] = React.useState<JoinCommunityStep>('inactive');

  const joinCommunity = useJoinCommunity({
    communityID,
    keyserverOverride,
    calendarQuery,
    ongoingJoinData,
    setOngoingJoinData,
    step,
    setStep,
    inviteSecret,
    setLinkStatus,
    threadID: verificationResponse.thread?.id,
  });

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
      join: joinCommunity,
      joinLoadingStatus,
    }),
    [joinCommunity, joinLoadingStatus],
  );
}

export { useInviteLinksActions, useAcceptInviteLink, inviteLinkTexts };
