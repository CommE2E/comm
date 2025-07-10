// @flow

import invariant from 'invariant';
import React from 'react';
import uuid from 'uuid';

import { useChatMentionContext } from './chat-mention-hooks.js';
import genesis from '../facts/genesis.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { childThreadInfos } from '../selectors/thread-selectors.js';
import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from '../shared/dm-ops/dm-op-types.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import { permissionsAndAuthRelatedRequestTimeout } from '../shared/timeouts.js';
import type {
  DMCreateSidebarOperation,
  DMCreateThreadOperation,
} from '../types/dm-ops';
import type { CalendarQuery } from '../types/entry-types.js';
import type {
  RawThreadInfo,
  ResolvedThreadInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientNewThinThreadRequest,
  ClientThreadJoinRequest,
  LeaveThreadPayload,
  NewThickThreadRequest,
  NewThreadResult,
  RoleDeletionPayload,
  RoleDeletionRequest,
  RoleModificationPayload,
  RoleModificationRequest,
  ThreadFetchMediaRequest,
  ThreadFetchMediaResult,
  ThreadJoinPayload,
  UpdateThreadRequest,
} from '../types/thread-types.js';
import { values } from '../utils/objects.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useChildThreadInfosMap(): {
  +[id: string]: $ReadOnlyArray<ResolvedThreadInfo>,
} {
  const childThreadInfosMap = useSelector(childThreadInfos);

  const { getCommunityThreadIDForGenesisThreads, chatMentionCandidatesObj } =
    useChatMentionContext();

  return React.useMemo(() => {
    const result: { [id: string]: $ReadOnlyArray<ResolvedThreadInfo> } = {};
    for (const parentThreadID in childThreadInfosMap) {
      result[parentThreadID] = childThreadInfosMap[parentThreadID]
        .map(rawThreadInfo => {
          const communityThreadIDForGenesisThreads =
            getCommunityThreadIDForGenesisThreads(rawThreadInfo);
          const community =
            rawThreadInfo.community === genesis().id
              ? communityThreadIDForGenesisThreads
              : (rawThreadInfo.community ?? rawThreadInfo.id);
          if (!community) {
            return undefined;
          }
          const communityThreads = chatMentionCandidatesObj[community];
          if (!communityThreads) {
            return undefined;
          }
          return communityThreads[rawThreadInfo.id]?.threadInfo;
        })
        .filter(Boolean);
    }
    return result;
  }, [
    childThreadInfosMap,
    getCommunityThreadIDForGenesisThreads,
    chatMentionCandidatesObj,
  ]);
}

function useNewThickThread(): (
  input: NewThickThreadRequest,
) => Promise<string> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  return React.useCallback(
    async (input: NewThickThreadRequest) => {
      invariant(viewerID, 'viewerID must be defined');
      const threadID = input.id ?? uuid.v4();

      let op;
      let recipientIDs;
      if (input.type === threadTypes.THICK_SIDEBAR) {
        const { parentThreadID, sourceMessageID, initialMemberIDs } = input;
        invariant(
          parentThreadID,
          'parentThreadID has to be defined for thick sidebar',
        );
        const sidebarOP: DMCreateSidebarOperation = {
          creatorID: viewerID,
          memberIDs: initialMemberIDs ?? [],
          newCreateSidebarMessageID: uuid.v4(),
          newSidebarSourceMessageID: uuid.v4(),
          parentThreadID: parentThreadID,
          roleID: uuid.v4(),
          sourceMessageID: sourceMessageID,
          threadID,
          time: Date.now(),
          type: 'create_sidebar',
        };
        op = sidebarOP;
        recipientIDs = threadInfos[parentThreadID].members.map(
          member => member.id,
        );
      } else {
        const { type, initialMemberIDs } = input;

        const threadOP: DMCreateThreadOperation = {
          creatorID: viewerID,
          memberIDs: initialMemberIDs ?? [],
          newMessageID: uuid.v4(),
          roleID: uuid.v4(),
          threadID,
          threadType: type,
          time: Date.now(),
          type: 'create_thread',
        };
        op = threadOP;
        recipientIDs = [...(input.initialMemberIDs ?? []), viewerID];
      }
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'some_users',
          userIDs: recipientIDs,
        },
      };
      await processAndSendDMOperation(opSpecification);
      return threadID;
    },
    [processAndSendDMOperation, threadInfos, viewerID],
  );
}

export { useChildThreadInfosMap, useNewThickThread };
export type DeleteThreadInput = {
  +threadID: string,
};
const deleteThreadEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const deleteThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeleteThreadInput) => Promise<LeaveThreadPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'delete_thread',
      requests,
      deleteThreadEndpointOptions,
    );
    const response = responses[keyserverID];
    return {
      updatesResult: response.updatesResult,
    };
  };

function useDeleteThread(): (
  input: DeleteThreadInput,
) => Promise<LeaveThreadPayload> {
  return useKeyserverCall(deleteThread);
}

const changeThreadSettingsEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const changeThreadSettings =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: UpdateThreadRequest) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    invariant(
      Object.keys(input.changes).length > 0,
      'No changes provided to changeThreadSettings!',
    );
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'update_thread',
      requests,
      changeThreadSettingsEndpointOptions,
    );
    const response = responses[keyserverID];
    return {
      threadID: input.threadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
    };
  };
export type UseChangeThreadSettingsInput = $ReadOnly<{
  ...UpdateThreadRequest,
  +threadInfo: ThreadInfo,
}>;

function useChangeThreadSettings(): (
  input: UseChangeThreadSettingsInput,
) => Promise<ChangeThreadSettingsPayload> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const keyserverCall = useKeyserverCall(changeThreadSettings);

  return React.useCallback(
    async (input: UseChangeThreadSettingsInput) =>
      threadSpecs[input.threadInfo.type].protocol().changeThreadSettings(
        { input, viewerID },
        {
          processAndSendDMOperation,
          keyserverChangeThreadSettings: keyserverCall,
        },
      ),
    [keyserverCall, processAndSendDMOperation, viewerID],
  );
}

export type RemoveUsersFromThreadInput = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
};
const removeMembersFromThreadEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const removeUsersFromThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: RemoveUsersFromThreadInput,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'remove_members',
      requests,
      removeMembersFromThreadEndpointOptions,
    );
    const response = responses[keyserverID];
    return {
      threadID: input.threadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
    };
  };

function useRemoveUsersFromThread(): (
  input: RemoveUsersFromThreadInput,
) => Promise<ChangeThreadSettingsPayload> {
  return useKeyserverCall(removeUsersFromThread);
}

export type ChangeThreadMemberRolesInput = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
  +newRole: string,
};
const changeThreadMemberRoleEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const changeThreadMemberRoles =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: ChangeThreadMemberRolesInput,
  ) => Promise<ChangeThreadSettingsPayload>) =>
  async input => {
    const { threadID, memberIDs, newRole } = input;
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = {
      [keyserverID]: {
        threadID,
        memberIDs,
        role: newRole,
      },
    };

    const responses = await callKeyserverEndpoint(
      'update_role',
      requests,
      changeThreadMemberRoleEndpointOptions,
    );
    const response = responses[keyserverID];
    return {
      threadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
    };
  };

function useChangeThreadMemberRoles(): (
  input: ChangeThreadMemberRolesInput,
) => Promise<ChangeThreadSettingsPayload> {
  return useKeyserverCall(changeThreadMemberRoles);
}

const newThinThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ClientNewThinThreadRequest) => Promise<NewThreadResult>) =>
  async input => {
    const parentThreadID = input.parentThreadID ?? genesis().id;
    const keyserverID = extractKeyserverIDFromID(parentThreadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint('create_thread', requests);
    const response = responses[keyserverID];

    return {
      newThreadID: response.newThreadID,
      updatesResult: response.updatesResult,
      newMessageInfos: response.newMessageInfos,
      userInfos: response.userInfos,
    };
  };

function useNewThinThread(): (
  input: ClientNewThinThreadRequest,
) => Promise<NewThreadResult> {
  return useKeyserverCall(newThinThread);
}

const joinThreadOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const joinThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'join_thread',
      requests,
      joinThreadOptions,
    );
    const response = responses[keyserverID];
    const userInfos = values(response.userInfos);
    return {
      updatesResult: response.updatesResult,
      rawMessageInfos: response.rawMessageInfos,
      truncationStatuses: response.truncationStatuses,
      userInfos,
      keyserverID,
    };
  };

function useJoinKeyserverThread(): ClientThreadJoinRequest => Promise<ThreadJoinPayload> {
  return useKeyserverCall(joinThread);
}

export type UseJoinThreadInput = {
  +rawThreadInfo: RawThreadInfo,
  +calendarQuery: () => CalendarQuery,
};

function useJoinThread(): (
  input: UseJoinThreadInput,
) => Promise<ThreadJoinPayload> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const keyserverCall = useJoinKeyserverThread();
  return React.useCallback(
    async (input: UseJoinThreadInput) =>
      threadSpecs[input.rawThreadInfo.type].protocol().joinThread(
        {
          rawThreadInfo: input.rawThreadInfo,
          viewerID,
        },
        {
          processAndSendDMOperation,
          keyserverJoinThread: keyserverCall,
          calendarQuery: input.calendarQuery,
        },
      ),
    [keyserverCall, processAndSendDMOperation, viewerID],
  );
}

export type LeaveThreadInput = {
  +threadID: string,
};
const leaveThreadEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const leaveThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: LeaveThreadInput) => Promise<LeaveThreadPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'leave_thread',
      requests,
      leaveThreadEndpointOptions,
    );
    const response = responses[keyserverID];
    return {
      updatesResult: response.updatesResult,
    };
  };

export type UseLeaveThreadInput = {
  +threadInfo: ThreadInfo,
};
export type LeaveThreadResult = {
  +invalidatedThreads: $ReadOnlyArray<string>,
};
function useLeaveThread(): (
  input: UseLeaveThreadInput,
) => Promise<LeaveThreadResult> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const keyserverLeaveThread = useKeyserverCall(leaveThread);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    (input: UseLeaveThreadInput) =>
      threadSpecs[input.threadInfo.type].protocol().leaveThread(
        { threadInfo: input.threadInfo, viewerID },
        {
          processAndSendDMOperation,
          keyserverLeaveThread,
          dispatchActionPromise,
        },
      ),
    [
      dispatchActionPromise,
      keyserverLeaveThread,
      processAndSendDMOperation,
      viewerID,
    ],
  );
}

const fetchThreadMedia =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: ThreadFetchMediaRequest) => Promise<ThreadFetchMediaResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'fetch_thread_media',
      requests,
    );
    const response = responses[keyserverID];
    return { media: response.media };
  };

function useFetchThreadMedia(): (
  input: ThreadFetchMediaRequest,
) => Promise<ThreadFetchMediaResult> {
  return useKeyserverCall(fetchThreadMedia);
}

const modifyCommunityRole =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: RoleModificationRequest) => Promise<RoleModificationPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.community);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'modify_community_role',
      requests,
    );
    const response = responses[keyserverID];
    return {
      threadInfo: response.threadInfo,
      updatesResult: response.updatesResult,
    };
  };

function useModifyCommunityRole(): (
  input: RoleModificationRequest,
) => Promise<RoleModificationPayload> {
  return useKeyserverCall(modifyCommunityRole);
}

const deleteCommunityRole =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: RoleDeletionRequest) => Promise<RoleDeletionPayload>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.community);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'delete_community_role',
      requests,
    );
    const response = responses[keyserverID];
    return {
      threadInfo: response.threadInfo,
      updatesResult: response.updatesResult,
    };
  };

function useDeleteCommunityRole(): (
  input: RoleDeletionRequest,
) => Promise<RoleDeletionPayload> {
  return useKeyserverCall(deleteCommunityRole);
}

export {
  useDeleteCommunityRole,
  useModifyCommunityRole,
  useFetchThreadMedia,
  useLeaveThread,
  useJoinThread,
  useNewThinThread,
  useChangeThreadMemberRoles,
  useRemoveUsersFromThread,
  useChangeThreadSettings,
  useDeleteThread,
  useJoinKeyserverThread,
};
