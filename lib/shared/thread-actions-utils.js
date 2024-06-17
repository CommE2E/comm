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
  type RemoveUsersFromThreadInput,
} from '../actions/thread-actions.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  threadTypes,
  assertThinThreadType,
} from '../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  ClientNewThinThreadRequest,
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
  +sourceMessageID: ?string,
  +viewerID: ?string,
  +handleError?: () => mixed,
  +calendarQuery: CalendarQuery,
};

async function createRealThreadFromPendingThread({
  threadInfo,
  dispatchActionPromise,
  createNewThinThread,
  sourceMessageID,
  viewerID,
  calendarQuery,
}: CreateRealThreadParameters): Promise<string> {
  if (!threadIsPending(threadInfo.id)) {
    return threadInfo.id;
  }

  const otherMemberIDs = threadOtherMembers(threadInfo.members, viewerID).map(
    member => member.id,
  );
  let resultPromise;
  if (threadInfo.type !== threadTypes.SIDEBAR) {
    invariant(
      otherMemberIDs.length > 0,
      'otherMemberIDs should not be empty for threads',
    );
    // TODO add support for thickThreadTypes in ENG-8442
    const type = assertThinThreadType(pendingThreadType(otherMemberIDs.length));
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
  } else {
    invariant(
      sourceMessageID,
      'sourceMessageID should be set when creating a sidebar',
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
  }
  void dispatchActionPromise(newThreadActionTypes, resultPromise);
  const { newThreadID } = await resultPromise;
  return newThreadID;
}

export { removeMemberFromThread, createRealThreadFromPendingThread };
