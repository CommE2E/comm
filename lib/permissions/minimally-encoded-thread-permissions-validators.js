// @flow

import t, { type TInterface } from 'tcomb';

import {
  roleInfoValidator,
  threadCurrentUserInfoValidator,
} from './minimally-encoded-raw-thread-info-validators.js';
import { clientAvatarValidator } from '../types/avatar-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeValidator } from '../types/thread-types-enum.js';
import { threadEntityValidator } from '../utils/entity-text.js';
import { tBool, tID, tShape, tUserID } from '../utils/validation-utils.js';

const relativeMemberInfoValidator: TInterface<RelativeMemberInfo> =
  tShape<RelativeMemberInfo>({
    id: tUserID,
    role: t.maybe(tID),
    minimallyEncoded: tBool(true),
    isSender: t.Boolean,
    username: t.maybe(t.String),
    isViewer: t.Boolean,
  });

const threadInfoValidator: TInterface<ThreadInfo> = tShape<ThreadInfo>({
  minimallyEncoded: tBool(true),
  id: tID,
  type: threadTypeValidator,
  name: t.maybe(t.String),
  uiName: t.union([t.String, threadEntityValidator]),
  avatar: t.maybe(clientAvatarValidator),
  description: t.maybe(t.String),
  color: t.String,
  creationTime: t.Number,
  parentThreadID: t.maybe(tID),
  containingThreadID: t.maybe(tID),
  community: t.maybe(tID),
  members: t.list(relativeMemberInfoValidator),
  roles: t.dict(tID, roleInfoValidator),
  currentUser: threadCurrentUserInfoValidator,
  sourceMessageID: t.maybe(tID),
  repliesCount: t.Number,
  pinnedCount: t.maybe(t.Number),
});

export { relativeMemberInfoValidator, threadInfoValidator };
