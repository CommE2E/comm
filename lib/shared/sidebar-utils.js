// @flow

import invariant from 'invariant';

import type { ParserRules } from './markdown.js';
import { getMessageTitle, isInvalidSidebarSource } from './message-utils.js';
import { relationshipBlockedInEitherDirection } from './relationship-utils.js';
import {
  createPendingThread,
  getSingleOtherUser,
  extractMentionedMembers,
  useThreadHasPermission,
  userIsMember,
} from './thread-utils.js';
import type { ChatMessageInfoItem } from '../selectors/chat-selectors.js';
import { chatMessageInfoItemTargetableMessageInfo } from '../shared/chat-message-item-utils.js';
import { messageTypes } from '../types/message-types-enum.js';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import {
  threadTypes,
  threadTypeIsThick,
  threadTypeIsPersonal,
} from '../types/thread-types-enum.js';
import type { LoggedInUserInfo } from '../types/user-types.js';
import type { GetENSNames } from '../utils/ens-helpers.js';
import {
  entityTextToRawString,
  getEntityTextAsString,
} from '../utils/entity-text.js';
import type { GetFCNames } from '../utils/farcaster-helpers.js';
import { useSelector } from '../utils/redux-utils.js';
import { trimText } from '../utils/text-utils.js';

type SharedCreatePendingSidebarInput = {
  +sourceMessageInfo: ComposableMessageInfo | RobotextMessageInfo,
  +parentThreadInfo: ThreadInfo,
  +loggedInUserInfo: LoggedInUserInfo,
};

type BaseCreatePendingSidebarInput = {
  ...SharedCreatePendingSidebarInput,
  +messageTitle: string,
};

type UserIDAndUsername = {
  +id: string,
  +username: ?string,
  ...
};

function baseCreatePendingSidebar(
  input: BaseCreatePendingSidebarInput,
): ThreadInfo {
  const {
    sourceMessageInfo,
    parentThreadInfo,
    loggedInUserInfo,
    messageTitle,
  } = input;
  const { color, type: parentThreadType } = parentThreadInfo;
  const threadName = trimText(messageTitle, 30);

  const initialMembers = new Map<string, UserIDAndUsername>();

  const { id: viewerID, username: viewerUsername } = loggedInUserInfo;
  initialMembers.set(viewerID, { id: viewerID, username: viewerUsername });

  if (userIsMember(parentThreadInfo, sourceMessageInfo.creator.id)) {
    const { id: sourceAuthorID, username: sourceAuthorUsername } =
      sourceMessageInfo.creator;
    const initialMemberUserInfo = {
      id: sourceAuthorID,
      username: sourceAuthorUsername,
    };
    initialMembers.set(sourceAuthorID, initialMemberUserInfo);
  }

  const singleOtherUser = getSingleOtherUser(parentThreadInfo, viewerID);
  if (threadTypeIsPersonal(parentThreadType) && singleOtherUser) {
    const singleOtherUsername = parentThreadInfo.members.find(
      member => member.id === singleOtherUser,
    )?.username;
    const singleOtherUserInfo = {
      id: singleOtherUser,
      username: singleOtherUsername,
    };
    initialMembers.set(singleOtherUser, singleOtherUserInfo);
  }

  if (sourceMessageInfo.type === messageTypes.TEXT) {
    const mentionedMembersOfParent = extractMentionedMembers(
      sourceMessageInfo.text,
      parentThreadInfo,
    );
    for (const [memberID, member] of mentionedMembersOfParent) {
      initialMembers.set(memberID, member);
    }
  }

  return createPendingThread({
    viewerID,
    threadType: threadTypeIsThick(parentThreadInfo.type)
      ? threadTypes.THICK_SIDEBAR
      : threadTypes.SIDEBAR,
    members: [...initialMembers.values()],
    parentThreadInfo,
    threadColor: color,
    name: threadName,
    sourceMessageID: sourceMessageInfo.id,
  });
}

// The message title here may have ETH addresses that aren't resolved to ENS
// names. This function should only be used in cases where we're sure that we
// don't care about the thread title. We should prefer createPendingSidebar
// wherever possible
type CreateUnresolvedPendingSidebarInput = {
  ...SharedCreatePendingSidebarInput,
  +markdownRules: ParserRules,
};

function createUnresolvedPendingSidebar(
  input: CreateUnresolvedPendingSidebarInput,
): ThreadInfo {
  const {
    sourceMessageInfo,
    parentThreadInfo,
    loggedInUserInfo,
    markdownRules,
  } = input;

  const messageTitleEntityText = getMessageTitle(
    sourceMessageInfo,
    parentThreadInfo,
    parentThreadInfo,
    markdownRules,
  );
  const messageTitle = entityTextToRawString(messageTitleEntityText, {
    ignoreViewer: true,
  });

  return baseCreatePendingSidebar({
    sourceMessageInfo,
    parentThreadInfo,
    messageTitle,
    loggedInUserInfo,
  });
}

type CreatePendingSidebarInput = {
  ...SharedCreatePendingSidebarInput,
  +markdownRules: ParserRules,
  +getENSNames: ?GetENSNames,
  +getFCNames: ?GetFCNames,
};

async function createPendingSidebar(
  input: CreatePendingSidebarInput,
): Promise<ThreadInfo> {
  const {
    sourceMessageInfo,
    parentThreadInfo,
    loggedInUserInfo,
    markdownRules,
    getENSNames,
    getFCNames,
  } = input;

  const messageTitleEntityText = getMessageTitle(
    sourceMessageInfo,
    parentThreadInfo,
    parentThreadInfo,
    markdownRules,
  );
  const messageTitle = await getEntityTextAsString(
    messageTitleEntityText,
    { getENSNames, getFCNames },
    { ignoreViewer: true },
  );
  invariant(
    messageTitle !== null && messageTitle !== undefined,
    'getEntityTextAsString only returns falsey when passed falsey',
  );

  return baseCreatePendingSidebar({
    sourceMessageInfo,
    parentThreadInfo,
    messageTitle,
    loggedInUserInfo,
  });
}

function useCanCreateSidebarFromMessage(
  threadInfo: ThreadInfo,
  messageInfo: ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const messageCreatorUserInfo = useSelector(
    state => state.userStore.userInfos[messageInfo.creator.id],
  );
  const hasCreateSidebarsPermission = useThreadHasPermission(
    threadInfo,
    threadPermissions.CREATE_SIDEBARS,
  );
  if (!hasCreateSidebarsPermission) {
    return false;
  }

  if (
    (!messageInfo.id && !threadTypeIsThick(threadInfo.type)) ||
    (threadInfo.sourceMessageID &&
      threadInfo.sourceMessageID === messageInfo.id) ||
    isInvalidSidebarSource(messageInfo)
  ) {
    return false;
  }

  const messageCreatorRelationship = messageCreatorUserInfo?.relationshipStatus;
  return (
    !messageCreatorRelationship ||
    !relationshipBlockedInEitherDirection(messageCreatorRelationship)
  );
}

function useSidebarExistsOrCanBeCreated(
  threadInfo: ThreadInfo,
  messageItem: ChatMessageInfoItem,
): boolean {
  const targetableMessageInfo =
    chatMessageInfoItemTargetableMessageInfo(messageItem);
  const canCreateSidebarFromMessage = useCanCreateSidebarFromMessage(
    threadInfo,
    targetableMessageInfo,
  );
  return !!messageItem.threadCreatedFromMessage || canCreateSidebarFromMessage;
}

export {
  createUnresolvedPendingSidebar,
  createPendingSidebar,
  useCanCreateSidebarFromMessage,
  useSidebarExistsOrCanBeCreated,
};
