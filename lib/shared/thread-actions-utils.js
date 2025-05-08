// @flow

import invariant from 'invariant';

import {
  threadIsPending,
  threadOtherMembers,
  pendingThreadType,
} from './thread-utils.js';
import {
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
} from '../actions/thread-action-types.js';
import type { RemoveUsersFromThreadInput } from '../hooks/thread-hooks.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  threadTypes,
  assertThinThreadType,
  assertThickThreadType,
  threadTypeIsThick,
} from '../types/thread-types-enum.js';
import type { ThreadType } from '../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientNewThinThreadRequest,
  NewThickThreadRequest,
  NewThreadResult,
} from '../types/thread-types.js';
import type { DispatchActionPromise } from '../utils/redux-promise-utils.js';

function removeMemberFromThread(
  threadInfo: ThreadInfo,
  memberInfo: RelativeMemberInfo,
  dispatchActionPromise: DispatchActionPromise,
  removeUserFromThreadServerCall: (
    input: RemoveUsersFromThreadInput,
  ) => Promise<ChangeThreadSettingsPayload>,
) {
  const customKeyName = `${removeUsersFromThreadActionTypes.started}:${memberInfo.id}`;
  void dispatchActionPromise(
    removeUsersFromThreadActionTypes,
    removeUserFromThreadServerCall({
      threadID: threadInfo.id,
      memberIDs: [memberInfo.id],
    }),
    { customKeyName },
  );
}

type CreateRealThreadParameters = {
  +threadInfo: ThreadInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +createNewThinThread: ClientNewThinThreadRequest => Promise<NewThreadResult>,
  +createNewThickThread: NewThickThreadRequest => Promise<string>,
  +sourceMessageID: ?string,
  +viewerID: ?string,
  +handleError?: () => mixed,
  +calendarQuery: CalendarQuery,
};

async function createRealThreadFromPendingThread({
  threadInfo,
  dispatchActionPromise,
  createNewThinThread,
  createNewThickThread,
  sourceMessageID,
  viewerID,
  calendarQuery,
}: CreateRealThreadParameters): Promise<{
  +threadID: string,
  +threadType: ThreadType,
}> {
  if (!threadIsPending(threadInfo.id)) {
    return {
      threadID: threadInfo.id,
      threadType: threadInfo.type,
    };
  }

  let newThreadID;
  let newThreadType = threadInfo.type;

  const otherMemberIDs = threadOtherMembers(threadInfo.members, viewerID).map(
    member => member.id,
  );
  let resultPromise;
  if (threadInfo.type === threadTypes.SIDEBAR) {
    invariant(
      sourceMessageID,
      'sourceMessageID should be set when creating a sidebar',
    );
    invariant(
      threadInfo.parentThreadID,
      'parentThreadID should be set when creating a sidebar',
    );
    resultPromise = createNewThinThread({
      type: threadTypes.SIDEBAR,
      initialMemberIDs: otherMemberIDs,
      color: threadInfo.color,
      sourceMessageID,
      parentThreadID: threadInfo.parentThreadID,
      name: threadInfo.name,
      calendarQuery,
    });
    void dispatchActionPromise(newThreadActionTypes, resultPromise);
    const result = await resultPromise;
    newThreadID = result.newThreadID;
  } else if (threadInfo.type === threadTypes.THICK_SIDEBAR) {
    invariant(
      sourceMessageID,
      'sourceMessageID should be set when creating a sidebar',
    );
    invariant(
      threadInfo.parentThreadID,
      'parentThreadID should be set when creating a sidebar',
    );
    newThreadID = await createNewThickThread({
      type: threadTypes.THICK_SIDEBAR,
      initialMemberIDs: otherMemberIDs,
      color: threadInfo.color,
      sourceMessageID,
      parentThreadID: threadInfo.parentThreadID,
      name: threadInfo.name,
    });
  } else if (threadTypeIsThick(threadInfo.type)) {
    const type = assertThickThreadType(
      pendingThreadType(otherMemberIDs.length, 'thick'),
    );

    invariant(
      type !== 16,
      // Flow does not recognize that threadTypes.THICK_SIDEBAR is 16
      'pendingThreadType should not return THICK_SIDEBAR',
    );
    newThreadID = await createNewThickThread({
      type,
      initialMemberIDs: otherMemberIDs,
      color: threadInfo.color,
    });
    newThreadType = type;
  } else {
    const type = assertThinThreadType(
      pendingThreadType(otherMemberIDs.length, 'thin'),
    );

    invariant(
      type !== 5, // Flow does not recognize that threadTypes.SIDEBAR is 5
      'pendingThreadType should not return SIDEBAR',
    );
    resultPromise = createNewThinThread({
      type,
      initialMemberIDs: otherMemberIDs,
      color: threadInfo.color,
      calendarQuery,
    });
    void dispatchActionPromise(newThreadActionTypes, resultPromise);
    const result = await resultPromise;
    newThreadID = result.newThreadID;
    newThreadType = type;
  }
  return {
    threadID: newThreadID,
    threadType: newThreadType,
  };
}

export { removeMemberFromThread, createRealThreadFromPendingThread };
