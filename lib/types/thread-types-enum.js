// @flow

import invariant from 'invariant';
import type { TRefinement } from 'tcomb';

import { values } from '../utils/objects.js';
import { tNumEnum } from '../utils/validation-utils.js';

// Should be in sync with native/cpp/CommonCpp/NativeModules/\
// PersistentStorageUtilities/ThreadOperationsUtilities/ThreadTypeEnum.h
export const thinThreadTypes = Object.freeze({
  //OPEN: 0,   (DEPRECATED)
  //CLOSED: 1, (DEPRECATED)
  //SECRET: 2, (DEPRECATED)
  // has parent, not top-level (appears under parent in inbox), and visible to
  // all members of parent
  SIDEBAR: 5,
  // canonical thread for each pair of users. represents the friendship
  // created under GENESIS. being deprecated in favor of PERSONAL
  GENESIS_PERSONAL: 6,
  // canonical thread for each single user
  // created under GENESIS. being deprecated in favor of PRIVATE
  GENESIS_PRIVATE: 7,
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
export type ThinThreadType = $Values<typeof thinThreadTypes>;

export const nonSidebarThickThreadTypes = Object.freeze({
  // local "thick" thread (outside of community). no parent, can only have
  // sidebar children
  LOCAL: 13,
  // canonical thread for each pair of users. represents the friendship
  PERSONAL: 14,
  // canonical thread for each single user
  PRIVATE: 15,
});
export type NonSidebarThickThreadType = $Values<
  typeof nonSidebarThickThreadTypes,
>;

export const sidebarThickThreadTypes = Object.freeze({
  // has parent, not top-level (appears under parent in inbox), and visible to
  // all members of parent
  THICK_SIDEBAR: 16,
});
export type SidebarThickThreadType = $Values<typeof sidebarThickThreadTypes>;

export const thickThreadTypes = Object.freeze({
  ...nonSidebarThickThreadTypes,
  ...sidebarThickThreadTypes,
});
export type ThickThreadType =
  | NonSidebarThickThreadType
  | SidebarThickThreadType;

export type ThreadType = ThinThreadType | ThickThreadType;

export const threadTypes = Object.freeze({
  ...thinThreadTypes,
  ...thickThreadTypes,
});

const thickThreadTypesSet = new Set(Object.values(thickThreadTypes));
export function threadTypeIsThick(threadType: ThreadType): boolean {
  return thickThreadTypesSet.has(threadType);
}

export function assertThinThreadType(threadType: number): ThinThreadType {
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
    'number is not ThinThreadType enum',
  );
  return threadType;
}

export const thinThreadTypeValidator: TRefinement<number> = tNumEnum(
  values(thinThreadTypes),
);

export function assertThickThreadType(threadType: number): ThickThreadType {
  invariant(
    threadType === 13 ||
      threadType === 14 ||
      threadType === 15 ||
      threadType === 16,
    'number is not ThickThreadType enum',
  );
  return threadType;
}
export const thickThreadTypeValidator: TRefinement<number> = tNumEnum(
  values(thickThreadTypes),
);

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
      threadType === 12 ||
      threadType === 13 ||
      threadType === 14 ||
      threadType === 15 ||
      threadType === 16,
    'number is not ThreadType enum',
  );
  return threadType;
}

export const threadTypeValidator: TRefinement<number> = tNumEnum(
  values(threadTypes),
);

export const communityThreadTypes: $ReadOnlyArray<ThinThreadType> =
  Object.freeze([
    threadTypes.COMMUNITY_ROOT,
    threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
    threadTypes.GENESIS,
  ]);

export const announcementThreadTypes: $ReadOnlyArray<ThinThreadType> =
  Object.freeze([
    threadTypes.GENESIS,
    threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
    threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD,
    threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD,
  ]);

export const communitySubthreads: $ReadOnlyArray<ThinThreadType> =
  Object.freeze([
    threadTypes.COMMUNITY_OPEN_SUBTHREAD,
    threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD,
    threadTypes.COMMUNITY_SECRET_SUBTHREAD,
    threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD,
  ]);

export const sidebarThreadTypes: $ReadOnlyArray<ThreadType> = Object.freeze([
  threadTypes.SIDEBAR,
  threadTypes.THICK_SIDEBAR,
]);

export const personalThreadTypes: $ReadOnlyArray<ThreadType> = Object.freeze([
  threadTypes.PERSONAL,
  threadTypes.GENESIS_PERSONAL,
]);

export const privateThreadTypes: $ReadOnlyArray<ThreadType> = Object.freeze([
  threadTypes.PRIVATE,
  threadTypes.GENESIS_PRIVATE,
]);

export function threadTypeIsCommunityRoot(threadType: ThreadType): boolean {
  return communityThreadTypes.includes(threadType);
}

export function threadTypeIsAnnouncementThread(
  threadType: ThreadType,
): boolean {
  return announcementThreadTypes.includes(threadType);
}

export function threadTypeIsSidebar(threadType: ThreadType): boolean {
  return sidebarThreadTypes.includes(threadType);
}

export function threadTypeIsPersonal(threadType: ThreadType): boolean {
  return personalThreadTypes.includes(threadType);
}

export function threadTypeIsPrivate(threadType: ThreadType): boolean {
  return privateThreadTypes.includes(threadType);
}
