// @flow

import { addMembersSpec } from './add-members-spec.js';
import { addViewerToThreadMembersSpec } from './add-viewer-to-thread-members-spec.js';
import { changeThreadReadStatusSpec } from './change-thread-read-status-spec.js';
import { changeThreadSettingsSpec } from './change-thread-settings-spec.js';
import { changeThreadSubscriptionSpec } from './change-thread-subscription.js';
import { createEntrySpec } from './create-entry-spec.js';
import { createSidebarSpec } from './create-sidebar-spec.js';
import { createThreadSpec } from './create-thread-spec.js';
import { deleteEntrySpec } from './delete-entry-spec.js';
import type { DMOperationSpec } from './dm-op-spec.js';
import { editEntrySpec } from './edit-entry-spec.js';
import { joinThreadSpec } from './join-thread-spec.js';
import { leaveThreadSpec } from './leave-thread-spec.js';
import { sendDeleteMessageSpec } from './send-delete-message-spec.js';
import { sendEditMessageSpec } from './send-edit-message-spec.js';
import { sendMultimediaMessageSpec } from './send-multimedia-message-spec.js';
import { sendReactionMessageSpec } from './send-reaction-message-spec.js';
import { sendTextMessageSpec } from './send-text-message-spec.js';
import { updateRelationshipSpec } from './update-relationship-spec.js';
import { type DMOperationType, dmOperationTypes } from '../../types/dm-ops.js';

export const dmOpSpecs: {
  +[DMOperationType]: DMOperationSpec<any>,
} = Object.freeze({
  [dmOperationTypes.CREATE_THREAD]: createThreadSpec,
  [dmOperationTypes.CREATE_SIDEBAR]: createSidebarSpec,
  [dmOperationTypes.SEND_TEXT_MESSAGE]: sendTextMessageSpec,
  [dmOperationTypes.SEND_MULTIMEDIA_MESSAGE]: sendMultimediaMessageSpec,
  [dmOperationTypes.SEND_REACTION_MESSAGE]: sendReactionMessageSpec,
  [dmOperationTypes.SEND_EDIT_MESSAGE]: sendEditMessageSpec,
  [dmOperationTypes.ADD_MEMBERS]: addMembersSpec,
  [dmOperationTypes.ADD_VIEWER_TO_THREAD_MEMBERS]: addViewerToThreadMembersSpec,
  [dmOperationTypes.JOIN_THREAD]: joinThreadSpec,
  [dmOperationTypes.LEAVE_THREAD]: leaveThreadSpec,
  [dmOperationTypes.CHANGE_THREAD_SETTINGS]: changeThreadSettingsSpec,
  [dmOperationTypes.CHANGE_THREAD_SUBSCRIPTION]: changeThreadSubscriptionSpec,
  [dmOperationTypes.CHANGE_THREAD_READ_STATUS]: changeThreadReadStatusSpec,
  [dmOperationTypes.CREATE_ENTRY]: createEntrySpec,
  [dmOperationTypes.DELETE_ENTRY]: deleteEntrySpec,
  [dmOperationTypes.EDIT_ENTRY]: editEntrySpec,
  [dmOperationTypes.UPDATE_RELATIONSHIP]: updateRelationshipSpec,
  [dmOperationTypes.SEND_DELETE_MESSAGE]: sendDeleteMessageSpec,
});
