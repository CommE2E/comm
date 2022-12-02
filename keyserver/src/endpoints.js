// @flow

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
  create_account: accountCreationResponder,
  create_entry: entryCreationResponder,
  create_error_report: reportCreationResponder,
  create_message_report: messageReportCreationResponder,
  create_multimedia_message: multimediaMessageCreationResponder,
  create_report: reportCreationResponder,
  create_reports: reportMultiCreationResponder,
  create_text_message: textMessageCreationResponder,
  create_thread: threadCreationResponder,
  delete_account: accountDeletionResponder,
  delete_entry: entryDeletionResponder,
  delete_thread: threadDeletionResponder,
  delete_upload: uploadDeletionResponder,
  fetch_entries: entryFetchResponder,
  fetch_entry_revisions: entryRevisionFetchResponder,
  fetch_error_report_infos: errorReportFetchInfosResponder,
  fetch_messages: messageFetchResponder,
  get_session_public_keys: getSessionPublicKeysResponder,
  join_thread: threadJoinResponder,
  leave_thread: threadLeaveResponder,
  log_in: logInResponder,
  log_out: logOutResponder,
  policy_acknowledgment: policyAcknowledgmentResponder,
  remove_members: memberRemovalResponder,
  restore_entry: entryRestorationResponder,
  search_users: userSearchResponder,
  send_password_reset_email: sendPasswordResetEmailResponder,
  send_verification_email: sendVerificationEmailResponder,
  set_thread_unread_status: threadSetUnreadStatusResponder,
  update_account: passwordUpdateResponder,
  update_activity: updateActivityResponder,
  update_calendar_query: calendarQueryUpdateResponder,
  update_user_settings: updateUserSettingsResponder,
  update_device_token: deviceTokenUpdateResponder,
  update_entry: entryUpdateResponder,
  update_password: oldPasswordUpdateResponder,
  update_relationships: updateRelationshipsResponder,
  update_role: roleUpdateResponder,
  update_thread: threadUpdateResponder,
  update_user_subscription: userSubscriptionUpdateResponder,
  verify_code: codeVerificationResponder,
};

export { jsonEndpoints };
