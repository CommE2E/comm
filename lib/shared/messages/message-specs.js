// @flow

import { messageTypes, type MessageType } from '../../types/message-types';
import { addMembersMessageSpec } from './add-members-message-spec';
import { changeRoleMessageSpec } from './change-role-message-spec';
import { changeSettingsMessageSpec } from './change-settings-message-spec';
import { createEntryMessageSpec } from './create-entry-message-spec';
import { createSidebarMessageSpec } from './create-sidebar-message-spec';
import { createSubThreadMessageSpec } from './create-sub-thread-message-spec';
import { createThreadMessageSpec } from './create-thread-message-spec';
import { deleteEntryMessageSpec } from './delete-entry-message-spec';
import { editEntryMessageSpec } from './edit-entry-message-spec';
import { joinThreadMessageSpec } from './join-thread-message-spec';
import { leaveThreadMessageSpec } from './leave-thread-message-spec';
import { type MessageSpec } from './message-spec';
import { multimediaMessageSpec } from './multimedia-message-spec';
import { reactionMessageSpec } from './reaction-message-spec';
import { removeMembersMessageSpec } from './remove-members-message-spec';
import { restoreEntryMessageSpec } from './restore-entry-message-spec';
import { sidebarSourceMessageSpec } from './sidebar-source-message-spec';
import { textMessageSpec } from './text-message-spec';
import { unsupportedMessageSpec } from './unsupported-message-spec';
import { updateRelationshipMessageSpec } from './update-relationship-message-spec';

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
});
