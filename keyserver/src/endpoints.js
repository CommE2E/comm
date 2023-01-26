// @flow

import { baseLegalPolicies } from 'lib/facts/policies.js';
import type { Endpoint } from 'lib/types/endpoints';

import {
  updateActivityResponder,
  threadSetUnreadStatusResponder,
} from './responders/activity-responders';
import { deviceTokenUpdateResponder } from './responders/device-responders';
import {
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
  calendarQueryUpdateResponder,
} from './responders/entry-responders';
import type { JSONResponder } from './responders/handlers';
import { getSessionPublicKeysResponder } from './responders/keys-responders';
import { messageReportCreationResponder } from './responders/message-report-responder';
import {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
  reactionMessageCreationResponder,
} from './responders/message-responders';
import { updateRelationshipsResponder } from './responders/relationship-responders';
import {
  reportCreationResponder,
  reportMultiCreationResponder,
  errorReportFetchInfosResponder,
} from './responders/report-responders';
import { userSearchResponder } from './responders/search-responders';
import { siweNonceResponder } from './responders/siwe-nonce-responders';
import {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
} from './responders/thread-responders';
import {
  userSubscriptionUpdateResponder,
  passwordUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
  logOutResponder,
  accountDeletionResponder,
  accountCreationResponder,
  logInResponder,
  siweAuthResponder,
  oldPasswordUpdateResponder,
  updateUserSettingsResponder,
  policyAcknowledgmentResponder,
} from './responders/user-responders';
import { codeVerificationResponder } from './responders/verification-responders';
import { uploadDeletionResponder } from './uploads/uploads';

const jsonEndpoints: { [id: Endpoint]: JSONResponder } = {
  create_account: {
    responder: accountCreationResponder,
    requiredPolicies: [],
  },
  create_entry: {
    responder: entryCreationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  create_error_report: {
    responder: reportCreationResponder,
    requiredPolicies: [],
  },
  create_message_report: {
    responder: messageReportCreationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  create_multimedia_message: {
    responder: multimediaMessageCreationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  create_reaction_message: {
    responder: reactionMessageCreationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  create_report: {
    responder: reportCreationResponder,
    requiredPolicies: [],
  },
  create_reports: {
    responder: reportMultiCreationResponder,
    requiredPolicies: [],
  },
  create_text_message: {
    responder: textMessageCreationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  create_thread: {
    responder: threadCreationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  delete_account: {
    responder: accountDeletionResponder,
    requiredPolicies: [],
  },
  delete_entry: {
    responder: entryDeletionResponder,
    requiredPolicies: baseLegalPolicies,
  },
  delete_thread: {
    responder: threadDeletionResponder,
    requiredPolicies: baseLegalPolicies,
  },
  delete_upload: {
    responder: uploadDeletionResponder,
    requiredPolicies: baseLegalPolicies,
  },
  fetch_entries: {
    responder: entryFetchResponder,
    requiredPolicies: baseLegalPolicies,
  },
  fetch_entry_revisions: {
    responder: entryRevisionFetchResponder,
    requiredPolicies: baseLegalPolicies,
  },
  fetch_error_report_infos: {
    responder: errorReportFetchInfosResponder,
    requiredPolicies: baseLegalPolicies,
  },
  fetch_messages: {
    responder: messageFetchResponder,
    requiredPolicies: baseLegalPolicies,
  },
  get_session_public_keys: {
    responder: getSessionPublicKeysResponder,
    requiredPolicies: baseLegalPolicies,
  },
  join_thread: {
    responder: threadJoinResponder,
    requiredPolicies: baseLegalPolicies,
  },
  leave_thread: {
    responder: threadLeaveResponder,
    requiredPolicies: baseLegalPolicies,
  },
  log_in: {
    responder: logInResponder,
    requiredPolicies: [],
  },
  log_out: {
    responder: logOutResponder,
    requiredPolicies: [],
  },
  policy_acknowledgment: {
    responder: policyAcknowledgmentResponder,
    requiredPolicies: [],
  },
  remove_members: {
    responder: memberRemovalResponder,
    requiredPolicies: baseLegalPolicies,
  },
  restore_entry: {
    responder: entryRestorationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  search_users: {
    responder: userSearchResponder,
    requiredPolicies: baseLegalPolicies,
  },
  send_password_reset_email: {
    responder: sendPasswordResetEmailResponder,
    requiredPolicies: [],
  },
  send_verification_email: {
    responder: sendVerificationEmailResponder,
    requiredPolicies: [],
  },
  set_thread_unread_status: {
    responder: threadSetUnreadStatusResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_account: {
    responder: passwordUpdateResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_activity: {
    responder: updateActivityResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_calendar_query: {
    responder: calendarQueryUpdateResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_user_settings: {
    responder: updateUserSettingsResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_device_token: {
    responder: deviceTokenUpdateResponder,
    requiredPolicies: [],
  },
  update_entry: {
    responder: entryUpdateResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_password: {
    responder: oldPasswordUpdateResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_relationships: {
    responder: updateRelationshipsResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_role: {
    responder: roleUpdateResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_thread: {
    responder: threadUpdateResponder,
    requiredPolicies: baseLegalPolicies,
  },
  update_user_subscription: {
    responder: userSubscriptionUpdateResponder,
    requiredPolicies: baseLegalPolicies,
  },
  verify_code: {
    responder: codeVerificationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  siwe_nonce: {
    responder: siweNonceResponder,
    requiredPolicies: [],
  },
  siwe_auth: {
    responder: siweAuthResponder,
    requiredPolicies: [],
  },
};

export { jsonEndpoints };
