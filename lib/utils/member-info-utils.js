// @flow

import type {
  MemberInfoSansPermissions,
  MemberInfoWithPermissions,
  RawThreadInfo,
  ThinRawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';

function stripPermissionsFromMemberInfo(
  memberInfo: MemberInfoWithPermissions,
): MemberInfoSansPermissions {
  const { permissions, ...rest } = memberInfo;
  return rest;
}

export type ThinRawThreadInfoWithPermissions = $ReadOnly<{
  ...ThinRawThreadInfo,
  +members: $ReadOnlyArray<MemberInfoWithPermissions>,
}>;

function stripMemberPermissionsFromRawThreadInfo(
  rawThreadInfo: ThinRawThreadInfoWithPermissions,
): ThinRawThreadInfo {
  return {
    ...rawThreadInfo,
    members: rawThreadInfo.members.map(stripPermissionsFromMemberInfo),
  };
}

export type ThreadStoreWithMemberPermissions = {
  +[id: string]: ThinRawThreadInfoWithPermissions,
};
// NOTE: Don't modify this function without understanding
//       how it may affect existing client migrations.
function stripMemberPermissionsFromRawThreadInfos(
  threadStoreInfos: ThreadStoreWithMemberPermissions,
): RawThreadInfos {
  const strippedThreadStoreInfos: { [id: string]: RawThreadInfo } = {};

  for (const threadID in threadStoreInfos) {
    const rawThreadInfo: ThinRawThreadInfoWithPermissions =
      threadStoreInfos[threadID];

    // $FlowFixMe: We're only stripping permissions for thin threads.
    if (rawThreadInfo.thick) {
      console.log('Encountered thick thread... skipping permission stripping.');
      strippedThreadStoreInfos[threadID] = rawThreadInfo;
      continue;
    }

    const updatedRawThreadInfo: ThinRawThreadInfo =
      stripMemberPermissionsFromRawThreadInfo(rawThreadInfo);
    strippedThreadStoreInfos[threadID] = updatedRawThreadInfo;
  }

  return strippedThreadStoreInfos;
}
export {
  stripPermissionsFromMemberInfo,
  stripMemberPermissionsFromRawThreadInfo,
  stripMemberPermissionsFromRawThreadInfos,
};
