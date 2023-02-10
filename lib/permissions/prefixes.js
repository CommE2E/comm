// @flow

import {
  type ThreadPermission,
  assertThreadPermissions,
  threadPermissionPropagationPrefixes,
  type ThreadPermissionPropagationPrefix,
  threadPermissionFilterPrefixes,
  type ThreadPermissionFilterPrefix,
  threadTypes,
  type ThreadType,
} from '../types/thread-types.js';

type ParsedThreadPermissionString = {
  +permission: ThreadPermission,
  +propagationPrefix: ?ThreadPermissionPropagationPrefix,
  +filterPrefix: ?ThreadPermissionFilterPrefix,
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

  const permission = assertThreadPermissions(remainingString);

  return { permission, propagationPrefix, filterPrefix };
}

function includeThreadPermissionForThreadType(
  parsed: ParsedThreadPermissionString,
  threadType: ThreadType,
): boolean {
  if (
    threadType !== threadTypes.COMMUNITY_OPEN_SUBTHREAD &&
    threadType !== threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD &&
    threadType !== threadTypes.SIDEBAR &&
    (parsed.filterPrefix === threadPermissionFilterPrefixes.OPEN ||
      parsed.filterPrefix === threadPermissionFilterPrefixes.OPEN_TOP_LEVEL)
  ) {
    return false;
  } else if (
    threadType === threadTypes.SIDEBAR &&
    (parsed.filterPrefix === threadPermissionFilterPrefixes.TOP_LEVEL ||
      parsed.filterPrefix === threadPermissionFilterPrefixes.OPEN_TOP_LEVEL)
  ) {
    return false;
  }
  return true;
}

export { parseThreadPermissionString, includeThreadPermissionForThreadType };
