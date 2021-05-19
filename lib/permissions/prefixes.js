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
} from '../types/thread-types';

type ParsedThreadPermissionString = {|
  +permission: ThreadPermission,
  +propagationPrefix: ?ThreadPermissionPropagationPrefix,
  +filterPrefix: ?ThreadPermissionFilterPrefix,
|};
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
    parsed.filterPrefix === threadPermissionFilterPrefixes.OPEN &&
    (threadType !== threadTypes.CHAT_NESTED_OPEN ||
      threadType !== threadTypes.SIDEBAR)
  ) {
    return false;
  }
  return true;
}

export { parseThreadPermissionString, includeThreadPermissionForThreadType };
