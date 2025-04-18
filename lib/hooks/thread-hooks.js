// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { useChatMentionContext } from './chat-mention-hooks.js';
import genesis from '../facts/genesis.js';
import { childThreadInfos } from '../selectors/thread-selectors.js';
import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from '../shared/dm-ops/dm-op-types.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import type {
  DMCreateSidebarOperation,
  DMCreateThreadOperation,
} from '../types/dm-ops';
import type { ResolvedThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type { NewThickThreadRequest } from '../types/thread-types.js';
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
              : rawThreadInfo.community ?? rawThreadInfo.id;
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
