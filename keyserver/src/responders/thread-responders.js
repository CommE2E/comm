// @flow

import t from 'tcomb';
import type { TInterface, TUnion } from 'tcomb';

import { mediaValidator } from 'lib/types/media-types.js';
import {
  rawMessageInfoValidator,
  messageTruncationStatusesValidator,
} from 'lib/types/message-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import {
  type ThreadDeletionRequest,
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  type UpdateThreadRequest,
  type ServerNewThreadRequest,
  type NewThreadResponse,
  type ServerThreadJoinRequest,
  type ThreadJoinResult,
  type ThreadFetchMediaResult,
  type ThreadFetchMediaRequest,
  type ToggleMessagePinRequest,
  type ToggleMessagePinResult,
  rawThreadInfoValidator,
} from 'lib/types/thread-types.js';
import { serverUpdateInfoValidator } from 'lib/types/update-types.js';
import { userInfosValidator } from 'lib/types/user-types.js';
import { updateUserAvatarRequestValidator } from 'lib/utils/avatar-utils.js';
import { values } from 'lib/utils/objects.js';
import {
  tShape,
  tNumEnum,
  tColor,
  tPassword,
  tID,
} from 'lib/utils/validation-utils.js';

import {
  entryQueryInputValidator,
  verifyCalendarQueryThreadIDs,
} from './entry-responders.js';
import { createThread } from '../creators/thread-creator.js';
import { deleteThread } from '../deleters/thread-deleters.js';
import { fetchMediaForThread } from '../fetchers/upload-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
  toggleMessagePinForThread,
} from '../updaters/thread-updaters.js';
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const threadDeletionRequestInputValidator = tShape<ThreadDeletionRequest>({
  threadID: tID,
  accountPassword: t.maybe(tPassword),
});

export const leaveThreadResultValidator: TInterface<LeaveThreadResult> =
  tShape<LeaveThreadResult>({
    threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function threadDeletionResponder(
  viewer: Viewer,
  input: mixed,
): Promise<LeaveThreadResult> {
  const request = await validateInput(
    viewer,
    threadDeletionRequestInputValidator,
    input,
  );
  const result = await deleteThread(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    leaveThreadResultValidator,
    result,
  );
}

export const roleChangeRequestInputValidator: TInterface<RoleChangeRequest> =
  tShape<RoleChangeRequest>({
    threadID: tID,
    memberIDs: t.list(t.String),
    role: t.refinement(tID, str => {
      if (str.indexOf('|') !== -1) {
        str = str.split('|')[1];
      }
      const int = parseInt(str, 10);
      return String(int) === str && int > 0;
    }),
  });

export const changeThreadSettingsResultValidator: TInterface<ChangeThreadSettingsResult> =
  tShape<ChangeThreadSettingsResult>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    threadInfo: t.maybe(rawThreadInfoValidator),
    threadInfos: t.maybe(t.dict(tID, rawThreadInfoValidator)),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

async function roleUpdateResponder(
  viewer: Viewer,
  input: mixed,
): Promise<ChangeThreadSettingsResult> {
  const request = await validateInput(
    viewer,
    roleChangeRequestInputValidator,
    input,
  );
  const result = await updateRole(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    changeThreadSettingsResultValidator,
    result,
  );
}

const removeMembersRequestInputValidator = tShape<RemoveMembersRequest>({
  threadID: tID,
  memberIDs: t.list(t.String),
});

async function memberRemovalResponder(
  viewer: Viewer,
  input: mixed,
): Promise<ChangeThreadSettingsResult> {
  const request = await validateInput(
    viewer,
    removeMembersRequestInputValidator,
    input,
  );
  const result = await removeMembers(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    changeThreadSettingsResultValidator,
    result,
  );
}

const leaveThreadRequestInputValidator = tShape<LeaveThreadRequest>({
  threadID: tID,
});

async function threadLeaveResponder(
  viewer: Viewer,
  input: mixed,
): Promise<LeaveThreadResult> {
  const request = await validateInput(
    viewer,
    leaveThreadRequestInputValidator,
    input,
  );
  const result = await leaveThread(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    leaveThreadResultValidator,
    result,
  );
}

const updateThreadRequestInputValidator = tShape<UpdateThreadRequest>({
  threadID: tID,
  changes: tShape({
    type: t.maybe(tNumEnum(values(threadTypes))),
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    color: t.maybe(tColor),
    parentThreadID: t.maybe(tID),
    newMemberIDs: t.maybe(t.list(t.String)),
    avatar: t.maybe(updateUserAvatarRequestValidator),
  }),
  accountPassword: t.maybe(tPassword),
});

async function threadUpdateResponder(
  viewer: Viewer,
  input: mixed,
): Promise<ChangeThreadSettingsResult> {
  const request = await validateInput(
    viewer,
    updateThreadRequestInputValidator,
    input,
  );
  const result = await updateThread(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    changeThreadSettingsResultValidator,
    result,
  );
}

const threadRequestValidationShape = {
  name: t.maybe(t.String),
  description: t.maybe(t.String),
  color: t.maybe(tColor),
  parentThreadID: t.maybe(tID),
  initialMemberIDs: t.maybe(t.list(t.String)),
  calendarQuery: t.maybe(entryQueryInputValidator),
};
const newThreadRequestInputValidator: TUnion<ServerNewThreadRequest> = t.union([
  tShape({
    type: tNumEnum([threadTypes.SIDEBAR]),
    sourceMessageID: tID,
    ...threadRequestValidationShape,
  }),
  tShape({
    type: tNumEnum([
      threadTypes.COMMUNITY_OPEN_SUBTHREAD,
      threadTypes.COMMUNITY_SECRET_SUBTHREAD,
      threadTypes.PERSONAL,
      threadTypes.LOCAL,
      threadTypes.COMMUNITY_ROOT,
      threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
    ]),
    ...threadRequestValidationShape,
  }),
]);

export const newThreadResponseValidator: TInterface<NewThreadResponse> =
  tShape<NewThreadResponse>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
    newMessageInfos: t.list(rawMessageInfoValidator),
    newThreadInfo: t.maybe(rawThreadInfoValidator),
    userInfos: userInfosValidator,
    newThreadID: t.maybe(tID),
  });

async function threadCreationResponder(
  viewer: Viewer,
  input: mixed,
): Promise<NewThreadResponse> {
  const request = await validateInput(
    viewer,
    newThreadRequestInputValidator,
    input,
  );

  const result = await createThread(viewer, request, {
    silentlyFailMembers: request.type === threadTypes.SIDEBAR,
  });
  return validateOutput(
    viewer.platformDetails,
    newThreadResponseValidator,
    result,
  );
}

const joinThreadRequestInputValidator = tShape<ServerThreadJoinRequest>({
  threadID: tID,
  calendarQuery: t.maybe(entryQueryInputValidator),
  inviteLinkSecret: t.maybe(t.String),
});

export const threadJoinResultValidator: TInterface<ThreadJoinResult> =
  tShape<ThreadJoinResult>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: userInfosValidator,
  });

async function threadJoinResponder(
  viewer: Viewer,
  input: mixed,
): Promise<ThreadJoinResult> {
  const request = await validateInput(
    viewer,
    joinThreadRequestInputValidator,
    input,
  );

  if (request.calendarQuery) {
    await verifyCalendarQueryThreadIDs(request.calendarQuery);
  }

  const result = await joinThread(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    threadJoinResultValidator,
    result,
  );
}

const threadFetchMediaRequestInputValidator = tShape<ThreadFetchMediaRequest>({
  threadID: tID,
  limit: t.Number,
  offset: t.Number,
});

export const threadFetchMediaResultValidator: TInterface<ThreadFetchMediaResult> =
  tShape<ThreadFetchMediaResult>({ media: t.list(mediaValidator) });

async function threadFetchMediaResponder(
  viewer: Viewer,
  input: mixed,
): Promise<ThreadFetchMediaResult> {
  const request = await validateInput(
    viewer,
    threadFetchMediaRequestInputValidator,
    input,
  );
  const result = await fetchMediaForThread(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    threadFetchMediaResultValidator,
    result,
  );
}

const toggleMessagePinRequestInputValidator = tShape<ToggleMessagePinRequest>({
  messageID: tID,
  action: t.enums.of(['pin', 'unpin']),
});

export const toggleMessagePinResultValidator: TInterface<ToggleMessagePinResult> =
  tShape<ToggleMessagePinResult>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    threadID: tID,
  });

async function toggleMessagePinResponder(
  viewer: Viewer,
  input: mixed,
): Promise<ToggleMessagePinResult> {
  const request = await validateInput(
    viewer,
    toggleMessagePinRequestInputValidator,
    input,
  );
  const result = await toggleMessagePinForThread(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    toggleMessagePinResultValidator,
    result,
  );
}

export {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
  threadFetchMediaResponder,
  newThreadRequestInputValidator,
  toggleMessagePinResponder,
};
