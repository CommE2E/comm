// @flow

import * as React from 'react';

import type { KeyserverOverride } from './invite-links.js';
import { useIsKeyserverURLValid } from './keyserver-utils.js';
import { useThreadHasPermission } from './thread-utils.js';
import { permissionsAndAuthRelatedRequestTimeout } from './timeouts.js';
import {
  createOrUpdateFarcasterChannelTagActionTypes,
  useCreateOrUpdateFarcasterChannelTag,
  deleteFarcasterChannelTagActionTypes,
  useDeleteFarcasterChannelTag,
} from '../actions/community-actions.js';
import { addKeyserverActionType } from '../actions/keyserver-actions.js';
import { joinThreadActionTypes } from '../actions/thread-action-types.js';
import type { LinkStatus } from '../hooks/invite-links.js';
import { useJoinKeyserverThread } from '../hooks/thread-hooks.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import { isLoggedInToKeyserver } from '../selectors/user-selectors.js';
import type {
  JoinCommunityStep,
  OngoingJoinCommunityData,
} from '../types/community-types.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type { SetState } from '../types/hook-types.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { ThreadSubscription } from '../types/subscription-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type { ThreadJoinPayload } from '../types/thread-types.js';
import { FetchTimeout } from '../utils/errors.js';
import { useCurrentUserFID } from '../utils/farcaster-utils.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

const tagFarcasterChannelCopy = {
  DESCRIPTION:
    'Tag a Farcaster channel so followers can find your Comm community!',
  CHANNEL_NAME_HEADER: 'Selected channel:',
  NO_CHANNEL_TAGGED: 'No Farcaster channel tagged',
  REMOVE_TAG_BUTTON: 'Remove tag',
};

const tagFarcasterChannelErrorMessages: { +[string]: string } = {
  already_in_use: 'This Farcaster channel is already tagged to a community.',
  channel_not_found: 'Could not find a channel with the provided name.',
};

function farcasterChannelTagBlobHash(farcasterChannelID: string): string {
  return `farcaster_channel_tag_${farcasterChannelID}`;
}

const createOrUpdateFarcasterChannelTagStatusSelector =
  createLoadingStatusSelector(createOrUpdateFarcasterChannelTagActionTypes);
function useCreateFarcasterChannelTag(
  commCommunityID: string,
  setError: SetState<?string>,
  onSuccessCallback?: () => mixed,
): {
  +createTag: (farcasterChannelID: string) => mixed,
  +isLoading: boolean,
} {
  const dispatchActionPromise = useDispatchActionPromise();

  const createOrUpdateFarcasterChannelTag =
    useCreateOrUpdateFarcasterChannelTag();

  const createCreateOrUpdateActionPromise = React.useCallback(
    async (farcasterChannelID: string) => {
      try {
        const res = await createOrUpdateFarcasterChannelTag({
          commCommunityID,
          farcasterChannelID,
        });

        onSuccessCallback?.();

        return res;
      } catch (e) {
        setError(e.message);
        throw e;
      }
    },
    [
      commCommunityID,
      createOrUpdateFarcasterChannelTag,
      onSuccessCallback,
      setError,
    ],
  );

  const createTag = React.useCallback(
    (farcasterChannelID: string) => {
      void dispatchActionPromise(
        createOrUpdateFarcasterChannelTagActionTypes,
        createCreateOrUpdateActionPromise(farcasterChannelID),
      );
    },
    [createCreateOrUpdateActionPromise, dispatchActionPromise],
  );

  const createOrUpdateFarcasterChannelTagStatus = useSelector(
    createOrUpdateFarcasterChannelTagStatusSelector,
  );
  const isLoading = createOrUpdateFarcasterChannelTagStatus === 'loading';

  return {
    createTag,
    isLoading,
  };
}

const deleteFarcasterChannelTagStatusSelector = createLoadingStatusSelector(
  deleteFarcasterChannelTagActionTypes,
);
function useRemoveFarcasterChannelTag(
  commCommunityID: string,
  farcasterChannelID: string,
  setError: SetState<?string>,
): {
  +removeTag: () => mixed,
  +isLoading: boolean,
} {
  const dispatchActionPromise = useDispatchActionPromise();

  const deleteFarcasterChannelTag = useDeleteFarcasterChannelTag();

  const createDeleteActionPromise = React.useCallback(async () => {
    try {
      return await deleteFarcasterChannelTag({
        commCommunityID,
        farcasterChannelID,
      });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [
    commCommunityID,
    deleteFarcasterChannelTag,
    farcasterChannelID,
    setError,
  ]);

  const removeTag = React.useCallback(() => {
    void dispatchActionPromise(
      deleteFarcasterChannelTagActionTypes,
      createDeleteActionPromise(),
    );
  }, [createDeleteActionPromise, dispatchActionPromise]);

  const deleteFarcasterChannelTagStatus = useSelector(
    deleteFarcasterChannelTagStatusSelector,
  );
  const isLoading = deleteFarcasterChannelTagStatus === 'loading';

  return {
    removeTag,
    isLoading,
  };
}

function useCanManageFarcasterChannelTag(community: ThreadInfo): boolean {
  const fid = useCurrentUserFID();

  const canManageFarcasterChannelTag = useThreadHasPermission(
    community,
    threadPermissions.MANAGE_FARCASTER_CHANNEL_TAGS,
  );

  return (
    canManageFarcasterChannelTag &&
    !!fid &&
    community.type !== threadTypes.GENESIS
  );
}

type UseJoinCommunityParams = {
  +communityID: ?string,
  +keyserverOverride: ?KeyserverOverride,
  +calendarQuery: () => CalendarQuery,
  +ongoingJoinData: ?OngoingJoinCommunityData,
  +setOngoingJoinData: SetState<?OngoingJoinCommunityData>,
  +step: JoinCommunityStep,
  +setStep: SetState<JoinCommunityStep>,
  +inviteSecret?: string,
  +setLinkStatus?: SetState<LinkStatus>,
  +threadID?: string,
  +defaultSubscription?: ThreadSubscription,
};
function useJoinCommunity(params: UseJoinCommunityParams): () => Promise<void> {
  const {
    communityID,
    keyserverOverride,
    calendarQuery,
    ongoingJoinData,
    setOngoingJoinData,
    step,
    setStep,
    inviteSecret,
    setLinkStatus,
    threadID,
    defaultSubscription,
  } = params;

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();

  const joinThread = useJoinKeyserverThread();

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

  const timeoutRef = React.useRef<?TimeoutID>();

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const createJoinPromise = React.useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (
        !keyserverID ||
        !communityID ||
        keyserverID !== extractKeyserverIDFromID(communityID)
      ) {
        reject();
        setLinkStatus?.('invalid');
        setOngoingJoinData(null);
        return;
      }
      const timeoutID = setTimeout(() => {
        reject();
        setOngoingJoinData(oldData => {
          if (oldData) {
            setLinkStatus?.('timed_out');
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
        threadID,
      });
      setStep('add_keyserver');
    });
  }, [
    communityID,
    keyserverID,
    setLinkStatus,
    setOngoingJoinData,
    setStep,
    threadID,
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
        setLinkStatus?.('invalid');
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
    setOngoingJoinData,
    setStep,
    step,
  ]);

  React.useEffect(() => {
    if (step === 'auth_to_keyserver' && ongoingJoinData && isAuthenticated) {
      setStep('join_community');
    }
  }, [isAuthenticated, ongoingJoinData, setStep, step]);

  const threadJoinPromiseRef = React.useRef<?Promise<ThreadJoinPayload>>(null);
  React.useEffect(() => {
    void (async () => {
      if (
        !ongoingJoinData ||
        step !== 'join_community' ||
        threadJoinPromiseRef.current
      ) {
        return;
      }
      const communityThreadID = ongoingJoinData.communityID;
      const query = calendarQuery();
      const joinThreadPromise = joinThread({
        threadID: communityThreadID,
        calendarQuery: {
          startDate: query.startDate,
          endDate: query.endDate,
          filters: [
            ...query.filters,
            { type: 'threads', threadIDs: [communityThreadID] },
          ],
        },
        inviteLinkSecret: inviteSecret,
        defaultSubscription,
      });
      threadJoinPromiseRef.current = joinThreadPromise;
      void dispatchActionPromise(joinThreadActionTypes, joinThreadPromise);

      try {
        await joinThreadPromise;
        setStep('join_thread');
      } catch (e) {
        if (e instanceof FetchTimeout) {
          setLinkStatus?.('timed_out');
        } else {
          setLinkStatus?.((status: LinkStatus) =>
            status === 'valid' ? 'invalid' : status,
          );
        }
        ongoingJoinData.reject();
        setOngoingJoinData(null);
      } finally {
        threadJoinPromiseRef.current = null;
      }
    })();
  }, [
    calendarQuery,
    joinThread,
    defaultSubscription,
    dispatchActionPromise,
    inviteSecret,
    ongoingJoinData,
    setLinkStatus,
    setOngoingJoinData,
    setStep,
    step,
  ]);

  React.useEffect(() => {
    void (async () => {
      if (!ongoingJoinData || step !== 'join_thread') {
        return;
      }
      if (!threadID) {
        setStep('finished');
        ongoingJoinData.resolve();
        setOngoingJoinData(null);
        return;
      }

      const query = calendarQuery();
      const request = {
        threadID,
        calendarQuery: {
          startDate: query.startDate,
          endDate: query.endDate,
          filters: [
            ...query.filters,
            { type: 'threads', threadIDs: [threadID] },
          ],
        },
      };

      const joinThreadPromise = joinThread(request);
      void dispatchActionPromise(joinThreadActionTypes, joinThreadPromise);

      try {
        await joinThreadPromise;
        setStep('finished');
        ongoingJoinData.resolve();
      } catch (e) {
        if (e instanceof FetchTimeout) {
          setLinkStatus?.('timed_out');
        } else {
          setLinkStatus?.((status: LinkStatus) =>
            status === 'valid' ? 'invalid' : status,
          );
        }
        ongoingJoinData.reject();
      } finally {
        setOngoingJoinData(null);
      }
    })();
  }, [
    calendarQuery,
    joinThread,
    dispatchActionPromise,
    inviteSecret,
    ongoingJoinData,
    setLinkStatus,
    setOngoingJoinData,
    setStep,
    step,
    threadID,
  ]);

  return createJoinPromise;
}

export {
  tagFarcasterChannelCopy,
  tagFarcasterChannelErrorMessages,
  farcasterChannelTagBlobHash,
  useCreateFarcasterChannelTag,
  useRemoveFarcasterChannelTag,
  useCanManageFarcasterChannelTag,
  useJoinCommunity,
};
