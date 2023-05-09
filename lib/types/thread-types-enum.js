// @flow

import invariant from 'invariant';
import type { TRefinement } from 'tcomb';

import { values } from '../utils/objects.js';
import { tNumEnum } from '../utils/validation-utils.js';

export const threadTypes = Object.freeze({
  //OPEN: 0,   (DEPRECATED)
  //CLOSED: 1, (DEPRECATED)
  //SECRET: 2, (DEPRECATED)
  // has parent, not top-level (appears under parent in inbox), and visible to
  // all members of parent
  SIDEBAR: 5,
  // canonical thread for each pair of users. represents the friendship
  PERSONAL: 6,
  // canonical thread for each single user
  PRIVATE: 7,
  // local "thick" thread (outside of community). no parent, can only have
  // sidebar children. currently a proxy for COMMUNITY_SECRET_SUBTHREAD until we
  // launch actual E2E
  LOCAL: 4,
  // aka "org". no parent, top-level, has admin
  COMMUNITY_ROOT: 8,
  // like COMMUNITY_ROOT, but members aren't voiced
  COMMUNITY_ANNOUNCEMENT_ROOT: 9,
  // an open subthread. has parent, top-level (not sidebar), and visible to all
  // members of parent. root ancestor is a COMMUNITY_ROOT
  COMMUNITY_OPEN_SUBTHREAD: 3,
  // like COMMUNITY_SECRET_SUBTHREAD, but members aren't voiced
  COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD: 10,
  // a secret subthread. optional parent, top-level (not sidebar), visible only
  // to its members. root ancestor is a COMMUNITY_ROOT
  COMMUNITY_SECRET_SUBTHREAD: 4,
  // like COMMUNITY_SECRET_SUBTHREAD, but members aren't voiced
  COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD: 11,
  // like COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD, but you can't leave
  GENESIS: 12,
});
export type ThreadType = $Values<typeof threadTypes>;
export function assertThreadType(threadType: number): ThreadType {
  invariant(
    threadType === 3 ||
      threadType === 4 ||
      threadType === 5 ||
      threadType === 6 ||
      threadType === 7 ||
      threadType === 8 ||
      threadType === 9 ||
      threadType === 10 ||
      threadType === 11 ||
      threadType === 12,
    'number is not ThreadType enum',
  );
  return threadType;
}
export const threadTypeValidator: TRefinement<number> = tNumEnum(
  values(threadTypes),
);

export const communityThreadTypes: $ReadOnlyArray<number> = Object.freeze([
  threadTypes.COMMUNITY_ROOT,
  threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
  threadTypes.GENESIS,
]);

export const communitySubthreads: $ReadOnlyArray<number> = Object.freeze([
  threadTypes.COMMUNITY_OPEN_SUBTHREAD,
  threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD,
  threadTypes.COMMUNITY_SECRET_SUBTHREAD,
  threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD,
]);

export function threadTypeIsCommunityRoot(threadType: ThreadType): boolean {
  return communityThreadTypes.includes(threadType);
}
