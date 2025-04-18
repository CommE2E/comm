// @flow

import { threadTypeIsSidebar } from '../shared/threads/thread-specs.js';
import {
  type ThreadPermission,
  type ThreadPermissionFilterPrefix,
  type ThreadPermissionPropagationPrefix,
  type ThreadPermissionMembershipPrefix,
  assertThreadPermission,
  threadPermissionFilterPrefixes,
  threadPermissionPropagationPrefixes,
  threadPermissionMembershipPrefixes,
} from '../types/thread-permission-types.js';
import { threadTypes, type ThreadType } from '../types/thread-types-enum.js';

type ParsedThreadPermissionString = {
  +permission: ThreadPermission,
  +propagationPrefix: ?ThreadPermissionPropagationPrefix,
  +filterPrefix: ?ThreadPermissionFilterPrefix,
  +membershipPrefix: ?ThreadPermissionMembershipPrefix,
};
function parseThreadPermissionString(
  threadPermissionString: string,
): ParsedThreadPermissionString {
  let remainingString = threadPermissionString;

  let propagationPrefix;
  for (const key in threadPermissionPropagationPrefixes) {
    const prefix = threadPermissionPropagationPrefixes[key];
    if (!remainingString.startsWith(prefix)) {
      continue;
    }
    propagationPrefix = prefix;
    remainingString = remainingString.substr(prefix.length);
    break;
  }

  let filterPrefix;
  for (const key in threadPermissionFilterPrefixes) {
    const prefix = threadPermissionFilterPrefixes[key];
    if (!remainingString.startsWith(prefix)) {
      continue;
    }
    filterPrefix = prefix;
    remainingString = remainingString.substr(prefix.length);
    break;
  }

  let membershipPrefix;
  for (const key in threadPermissionMembershipPrefixes) {
    const prefix = threadPermissionMembershipPrefixes[key];
    if (!remainingString.startsWith(prefix)) {
      continue;
    }
    membershipPrefix = prefix;
    remainingString = remainingString.substr(prefix.length);
    break;
  }

  const permission = assertThreadPermission(remainingString);

  return { permission, propagationPrefix, filterPrefix, membershipPrefix };
}

function constructThreadPermissionString(
  parsed: ParsedThreadPermissionString,
): string {
  const propagationPrefix = parsed.propagationPrefix ?? '';
  const filterPrefix = parsed.filterPrefix ?? '';
  const membershipPrefix = parsed.membershipPrefix ?? '';
  return (
    propagationPrefix + filterPrefix + membershipPrefix + parsed.permission
  );
}

function includeThreadPermissionForThreadType(
  parsed: ParsedThreadPermissionString,
  threadType: ThreadType,
  isMember: boolean,
): boolean {
  if (
    threadType !== threadTypes.COMMUNITY_OPEN_SUBTHREAD &&
    threadType !== threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD &&
    !threadTypeIsSidebar(threadType) &&
    (parsed.filterPrefix === threadPermissionFilterPrefixes.OPEN ||
      parsed.filterPrefix === threadPermissionFilterPrefixes.OPEN_TOP_LEVEL)
  ) {
    return false;
  } else if (
    threadTypeIsSidebar(threadType) &&
    (parsed.filterPrefix === threadPermissionFilterPrefixes.TOP_LEVEL ||
      parsed.filterPrefix === threadPermissionFilterPrefixes.OPEN_TOP_LEVEL)
  ) {
    return false;
  } else if (
    !isMember &&
    parsed.membershipPrefix === threadPermissionMembershipPrefixes.MEMBER
  ) {
    return false;
  }
  return true;
}

export {
  parseThreadPermissionString,
  constructThreadPermissionString,
  includeThreadPermissionForThreadType,
};
