// @flow

import { communityAnnouncementRootSpec } from './community-announcement-root-spec.js';
import { communityOpenAnnouncementSubthreadSpec } from './community-open-announcement-subthread-spec.js';
import { communityOpenSubthreadSpec } from './community-open-subthread-spec.js';
import { communityRootSpec } from './community-root-spec.js';
import { communitySecretAnnouncementSubthreadSpec } from './community-secret-announcement-subthread-spec.js';
import { communitySecretSubthreadSpec } from './community-secret-subthread-spec.js';
import { genesisPersonalSpec } from './genesis-personal-spec.js';
import { genesisPrivateSpec } from './genesis-private-spec.js';
import { genesisSpec } from './genesis-spec.js';
import { localSpec } from './local-spec.js';
import { personalSpec } from './personal-spec.js';
import { privateSpec } from './private-spec.js';
import { sidebarSpec } from './sidebar-spec.js';
import { thickSidebarSpec } from './thick-sidebar-spec.js';
import type { ThreadSpec, ThreadTrait } from './thread-spec.js';
import type { ThreadType } from '../../types/thread-types-enum.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { values } from '../../utils/objects.js';

export const threadSpecs: {
  +[ThreadType]: ThreadSpec,
} = Object.freeze({
  [threadTypes.SIDEBAR]: sidebarSpec,
  [threadTypes.GENESIS_PERSONAL]: genesisPersonalSpec,
  [threadTypes.GENESIS_PRIVATE]: genesisPrivateSpec,
  [threadTypes.COMMUNITY_ROOT]: communityRootSpec,
  [threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT]: communityAnnouncementRootSpec,
  [threadTypes.COMMUNITY_OPEN_SUBTHREAD]: communityOpenSubthreadSpec,
  [threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD]:
    communityOpenAnnouncementSubthreadSpec,
  [threadTypes.COMMUNITY_SECRET_SUBTHREAD]: communitySecretSubthreadSpec,
  [threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD]:
    communitySecretAnnouncementSubthreadSpec,
  [threadTypes.GENESIS]: genesisSpec,
  [threadTypes.LOCAL]: localSpec,
  [threadTypes.PERSONAL]: personalSpec,
  [threadTypes.PRIVATE]: privateSpec,
  [threadTypes.THICK_SIDEBAR]: thickSidebarSpec,
});
let threadTypesByTrait = null;

export function getThreadTypesByTrait(
  trait: ThreadTrait,
): $ReadOnlyArray<ThreadType> {
  if (!threadTypesByTrait) {
    const threadTypesByTraitMutable: { [ThreadTrait]: Array<ThreadType> } = {};
    for (const threadType of values(threadTypes)) {
      for (const threadTraits of threadSpecs[threadType].traits) {
        if (!threadTypesByTraitMutable[threadTraits]) {
          threadTypesByTraitMutable[threadTraits] = [];
        }
        threadTypesByTraitMutable[threadTraits].push(threadType);
      }
    }
    threadTypesByTrait = threadTypesByTraitMutable;
  }
  return threadTypesByTrait[trait];
}

export const communityThreadTypes: $ReadOnlyArray<ThreadType> =
  getThreadTypesByTrait('announcement');
export const communitySubthreads: $ReadOnlyArray<ThreadType> =
  getThreadTypesByTrait('communitySubthread');
export const sidebarThreadTypes: $ReadOnlyArray<ThreadType> =
  getThreadTypesByTrait('sidebar');
export const personalThreadTypes: $ReadOnlyArray<ThreadType> =
  getThreadTypesByTrait('personal');
export const privateThreadTypes: $ReadOnlyArray<ThreadType> =
  getThreadTypesByTrait('private');

export function threadTypeIsCommunityRoot(threadType: ThreadType): boolean {
  return threadSpecs[threadType].traits.has('community');
}

export function threadTypeIsAnnouncementThread(
  threadType: ThreadType,
): boolean {
  return threadSpecs[threadType].traits.has('announcement');
}

export function threadTypeIsSidebar(threadType: ThreadType): boolean {
  return threadSpecs[threadType].traits.has('sidebar');
}

export function threadTypeIsPersonal(threadType: ThreadType): boolean {
  return threadSpecs[threadType].traits.has('personal');
}

export function threadTypeIsPrivate(threadType: ThreadType): boolean {
  return threadSpecs[threadType].traits.has('private');
}
