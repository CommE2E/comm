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
import { getUserPublicKeysResponder } from './responders/keys-responders';
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
  accountUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
  logOutResponder,
  accountDeletionResponder,
  accountCreationResponder,
  logInResponder,
  passwordUpdateResponder,
  requestAccessResponder,
} from './responders/user-responders';
import { codeVerificationResponder } from './responders/verification-responders';
import { uploadDeletionResponder } from './uploads/uploads';

const jsonEndpoints: { [id: Endpoint]: JSONResponder } = {
  update_activity: updateActivityResponder,
  update_user_subscription: userSubscriptionUpdateResponder,
  update_device_token: deviceTokenUpdateResponder,
  update_account: accountUpdateResponder,
  send_verification_email: sendVerificationEmailResponder,
  search_users: userSearchResponder,
  send_password_reset_email: sendPasswordResetEmailResponder,
  create_text_message: textMessageCreationResponder,
  fetch_entries: entryFetchResponder,
  fetch_entry_revisions: entryRevisionFetchResponder,
  verify_code: codeVerificationResponder,
  delete_thread: threadDeletionResponder,
  create_entry: entryCreationResponder,
  update_entry: entryUpdateResponder,
  delete_entry: entryDeletionResponder,
  restore_entry: entryRestorationResponder,
  update_role: roleUpdateResponder,
  remove_members: memberRemovalResponder,
  leave_thread: threadLeaveResponder,
  update_thread: threadUpdateResponder,
  create_thread: threadCreationResponder,
  fetch_messages: messageFetchResponder,
  join_thread: threadJoinResponder,
  set_thread_unread_status: threadSetUnreadStatusResponder,
  log_out: logOutResponder,
  delete_account: accountDeletionResponder,
  create_account: accountCreationResponder,
  log_in: logInResponder,
  update_password: passwordUpdateResponder,
  create_error_report: reportCreationResponder,
  create_report: reportCreationResponder,
  create_reports: reportMultiCreationResponder,
  fetch_error_report_infos: errorReportFetchInfosResponder,
  request_access: requestAccessResponder,
  update_calendar_query: calendarQueryUpdateResponder,
  delete_upload: uploadDeletionResponder,
  create_multimedia_message: multimediaMessageCreationResponder,
  update_relationships: updateRelationshipsResponder,
  get_user_public_keys: getUserPublicKeysResponder,
};

export { jsonEndpoints };
