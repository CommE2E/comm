// @flow

import { addMembersMessageSpec } from './add-members-message-spec.js';
import { changeRoleMessageSpec } from './change-role-message-spec.js';
import { changeSettingsMessageSpec } from './change-settings-message-spec.js';
import { createEntryMessageSpec } from './create-entry-message-spec.js';
import { createSidebarMessageSpec } from './create-sidebar-message-spec.js';
import { createSubThreadMessageSpec } from './create-sub-thread-message-spec.js';
import { createThreadMessageSpec } from './create-thread-message-spec.js';
import { deleteEntryMessageSpec } from './delete-entry-message-spec.js';
import { editEntryMessageSpec } from './edit-entry-message-spec.js';
import { editMessageSpec } from './edit-message-spec.js';
import { joinThreadMessageSpec } from './join-thread-message-spec.js';
import { leaveThreadMessageSpec } from './leave-thread-message-spec.js';
import { type MessageSpec } from './message-spec.js';
import { multimediaMessageSpec } from './multimedia-message-spec.js';
import { reactionMessageSpec } from './reaction-message-spec.js';
import { removeMembersMessageSpec } from './remove-members-message-spec.js';
import { restoreEntryMessageSpec } from './restore-entry-message-spec.js';
import { sidebarSourceMessageSpec } from './sidebar-source-message-spec.js';
import { textMessageSpec } from './text-message-spec.js';
import { unsupportedMessageSpec } from './unsupported-message-spec.js';
import { updateRelationshipMessageSpec } from './update-relationship-message-spec.js';
import { messageTypes, type MessageType } from '../../types/message-types.js';

export const messageSpecs: {
  [MessageType]: MessageSpec<*, *, *>,
} = Object.freeze({
  [messageTypes.TEXT]: textMessageSpec,
  [messageTypes.CREATE_THREAD]: createThreadMessageSpec,
  [messageTypes.ADD_MEMBERS]: addMembersMessageSpec,
  [messageTypes.CREATE_SUB_THREAD]: createSubThreadMessageSpec,
  [messageTypes.CHANGE_SETTINGS]: changeSettingsMessageSpec,
  [messageTypes.REMOVE_MEMBERS]: removeMembersMessageSpec,
  [messageTypes.CHANGE_ROLE]: changeRoleMessageSpec,
  [messageTypes.LEAVE_THREAD]: leaveThreadMessageSpec,
  [messageTypes.JOIN_THREAD]: joinThreadMessageSpec,
  [messageTypes.CREATE_ENTRY]: createEntryMessageSpec,
  [messageTypes.EDIT_ENTRY]: editEntryMessageSpec,
  [messageTypes.DELETE_ENTRY]: deleteEntryMessageSpec,
  [messageTypes.RESTORE_ENTRY]: restoreEntryMessageSpec,
  [messageTypes.UNSUPPORTED]: unsupportedMessageSpec,
  [messageTypes.IMAGES]: multimediaMessageSpec,
  [messageTypes.MULTIMEDIA]: multimediaMessageSpec,
  [messageTypes.UPDATE_RELATIONSHIP]: updateRelationshipMessageSpec,
  [messageTypes.SIDEBAR_SOURCE]: sidebarSourceMessageSpec,
  [messageTypes.CREATE_SIDEBAR]: createSidebarMessageSpec,
  [messageTypes.REACTION]: reactionMessageSpec,
  [messageTypes.EDIT_MESSAGE]: editMessageSpec,
});
