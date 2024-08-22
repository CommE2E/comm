// @flow

import { addMembersSpec } from './add-members-spec.js';
import { addViewerToThreadMembersSpec } from './add-viewer-to-thread-members-spec.js';
import { changeThreadReadStatusSpec } from './change-thread-read-status-spec.js';
import { changeThreadSettingsSpec } from './change-thread-settings-spec.js';
import { changeThreadSubscriptionSpec } from './change-thread-subscription.js';
import { createSidebarSpec } from './create-sidebar-spec.js';
import { createThreadSpec } from './create-thread-spec.js';
import type { DMOperationSpec } from './dm-op-spec.js';
import { joinThreadSpec } from './join-thread-spec.js';
import { leaveThreadSpec } from './leave-thread-spec.js';
import { removeMembersSpec } from './remove-members-spec.js';
import { sendEditMessageSpec } from './send-edit-message-spec.js';
import { sendReactionMessageSpec } from './send-reaction-message-spec.js';
import { sendTextMessageSpec } from './send-text-message-spec.js';
import { type DMOperationType, dmOperationTypes } from '../../types/dm-ops.js';

export const dmOpSpecs: {
  +[DMOperationType]: DMOperationSpec<any>,
} = Object.freeze({
  [dmOperationTypes.CREATE_THREAD]: createThreadSpec,
  [dmOperationTypes.CREATE_SIDEBAR]: createSidebarSpec,
  [dmOperationTypes.SEND_TEXT_MESSAGE]: sendTextMessageSpec,
  [dmOperationTypes.SEND_REACTION_MESSAGE]: sendReactionMessageSpec,
  [dmOperationTypes.SEND_EDIT_MESSAGE]: sendEditMessageSpec,
  [dmOperationTypes.ADD_MEMBERS]: addMembersSpec,
  [dmOperationTypes.ADD_VIEWER_TO_THREAD_MEMBERS]: addViewerToThreadMembersSpec,
  [dmOperationTypes.JOIN_THREAD]: joinThreadSpec,
  [dmOperationTypes.LEAVE_THREAD]: leaveThreadSpec,
  [dmOperationTypes.REMOVE_MEMBERS]: removeMembersSpec,
  [dmOperationTypes.CHANGE_THREAD_SETTINGS]: changeThreadSettingsSpec,
  [dmOperationTypes.CHANGE_THREAD_SUBSCRIPTION]: changeThreadSubscriptionSpec,
  [dmOperationTypes.CHANGE_THREAD_READ_STATUS]: changeThreadReadStatusSpec,
});
