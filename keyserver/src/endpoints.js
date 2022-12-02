// @flow

import { policyTypes } from 'lib/facts/policies.js';
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
} from './responders/message-responders';
import { updateRelationshipsResponder } from './responders/relationship-responders';
import {
  reportCreationResponder,
  reportMultiCreationResponder,
  errorReportFetchInfosResponder,
} from './responders/report-responders';
import { userSearchResponder } from './responders/search-responders';
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
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  create_error_report: {
    responder: reportCreationResponder,
    requiredPolicies: [],
  },
  create_message_report: {
    responder: messageReportCreationResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  create_multimedia_message: {
    responder: multimediaMessageCreationResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
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
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  create_thread: {
    responder: threadCreationResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  delete_account: {
    responder: accountDeletionResponder,
    requiredPolicies: [],
  },
  delete_entry: {
    responder: entryDeletionResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  delete_thread: {
    responder: threadDeletionResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  delete_upload: {
    responder: uploadDeletionResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  fetch_entries: {
    responder: entryFetchResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  fetch_entry_revisions: {
    responder: entryRevisionFetchResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  fetch_error_report_infos: {
    responder: errorReportFetchInfosResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  fetch_messages: {
    responder: messageFetchResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  get_session_public_keys: {
    responder: getSessionPublicKeysResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  join_thread: {
    responder: threadJoinResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  leave_thread: {
    responder: threadLeaveResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
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
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  restore_entry: {
    responder: entryRestorationResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  search_users: {
    responder: userSearchResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
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
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_account: {
    responder: passwordUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_activity: {
    responder: updateActivityResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_calendar_query: {
    responder: calendarQueryUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_user_settings: {
    responder: updateUserSettingsResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_device_token: {
    responder: deviceTokenUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_entry: {
    responder: entryUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_password: {
    responder: oldPasswordUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_relationships: {
    responder: updateRelationshipsResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_role: {
    responder: roleUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_thread: {
    responder: threadUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  update_user_subscription: {
    responder: userSubscriptionUpdateResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
  verify_code: {
    responder: codeVerificationResponder,
    requiredPolicies: [policyTypes.tosAndPrivacyPolicy],
  },
};

export { jsonEndpoints };
