// @flow

import t from 'tcomb';

import {
  fetchCommunityInfosResponseValidator,
  fetchNativeDrawerAndDirectoryInfosResponseValidator,
} from './community-validators.js';
import {
  saveEntryResponseValidator,
  deltaEntryInfosResultValidator,
  fetchEntryInfosResponseValidator,
  fetchEntryRevisionInfosResultValidator,
  deleteEntryResponseValidator,
  restoreEntryResponseValidator,
} from './entry-validators.js';
import {
  createOrUpdateFarcasterChannelTagResponseValidator,
  deleteFarcasterChannelTagResponseValidator,
} from './farcaster-channel-tag-validators.js';
import {
  fetchInviteLinksResponseValidator,
  inviteLinkVerificationResponseValidator,
} from './link-validators.js';
import { messageReportCreationResultValidator } from './message-report-validators.js';
import {
  fetchMessageInfosResponseValidator,
  fetchPinnedMessagesResultValidator,
  sendEditMessageResponseValidator,
  sendMessageResponseValidator,
  searchMessagesResponseValidator,
} from './message-validators.js';
import { initialReduxStateValidator } from './redux-state-validators.js';
import { relationshipErrorsValidator } from './relationship-validators.js';
import {
  fetchErrorReportInfosResponseValidator,
  reportCreationResponseValidator,
} from './report-validators.js';
import {
  exactUserSearchResultValidator,
  userSearchResultValidator,
} from './search-validators.js';
import { siweNonceResponseValidator } from './siwe-nonce-validators.js';
import {
  changeThreadSettingsResultValidator,
  leaveThreadResultValidator,
  newThreadResponseValidator,
  roleDeletionResultValidator,
  roleModificationResultValidator,
  threadFetchMediaResultValidator,
  threadJoinResultValidator,
  toggleMessagePinResultValidator,
} from './thread-validators.js';
import { MultimediaUploadResultValidator } from './upload-validators.js';
import {
  claimUsernameResponseValidator,
  subscriptionUpdateResponseValidator,
  updateUserAvatarResponderValidator,
  logInResponseValidator,
  logOutResponseValidator,
  registerResponseValidator,
} from './user-validators.js';
import { versionResponseValidator } from './version-validators.js';
import {
  setThreadUnreadStatusResultValidator,
  updateActivityResultValidator,
} from '../activity-types.js';
import { inviteLinkValidator } from '../link-types.js';
import { uploadMultimediaResultValidator } from '../media-types.js';
import { getOlmSessionInitializationDataResponseValidator } from '../olm-session-types.js';
import { serverStateSyncSocketPayloadValidator } from '../socket-types.js';

const sessionChangingEndpoints = Object.freeze({
  log_out: {
    validator: logOutResponseValidator,
  },
  delete_account: {
    validator: logOutResponseValidator,
  },
  create_account: {
    validator: registerResponseValidator,
  },
  log_in: {
    validator: logInResponseValidator,
  },
  update_password: {
    validator: logInResponseValidator,
  },
  policy_acknowledgment: {
    validator: t.Nil,
  },
  keyserver_auth: {
    validator: logInResponseValidator,
  },
});

const uploadEndpoints = Object.freeze({
  upload_multimedia: {
    validator: MultimediaUploadResultValidator,
  },
});

const largeDataFetchEndpoints = Object.freeze({
  get_initial_redux_state: {
    validator: initialReduxStateValidator,
  },
  fetch_pending_updates: {
    validator: serverStateSyncSocketPayloadValidator,
  },
});

const socketOnlyEndpoints = Object.freeze({
  update_activity: {
    validator: updateActivityResultValidator,
  },
  update_calendar_query: {
    validator: deltaEntryInfosResultValidator,
  },
});

const socketPreferredEndpoints = Object.freeze({});

const httpPreferredEndpoints = Object.freeze({
  create_report: {
    validator: reportCreationResponseValidator,
  },
  create_reports: { validator: t.Nil },
  create_entry: { validator: saveEntryResponseValidator },
  create_error_report: { validator: reportCreationResponseValidator },
  create_message_report: { validator: messageReportCreationResultValidator },
  create_multimedia_message: { validator: sendMessageResponseValidator },
  create_or_update_public_link: { validator: inviteLinkValidator },
  create_reaction_message: { validator: sendMessageResponseValidator },
  edit_message: { validator: sendEditMessageResponseValidator },
  create_text_message: { validator: sendMessageResponseValidator },
  create_thread: { validator: newThreadResponseValidator },
  delete_entry: { validator: deleteEntryResponseValidator },
  delete_community_role: { validator: roleDeletionResultValidator },
  delete_thread: { validator: leaveThreadResultValidator },
  delete_upload: { validator: t.Nil },
  disable_invite_link: { validator: t.Nil },
  exact_search_user: { validator: exactUserSearchResultValidator },
  fetch_entries: { validator: fetchEntryInfosResponseValidator },
  fetch_entry_revisions: { validator: fetchEntryRevisionInfosResultValidator },
  fetch_error_report_infos: {
    validator: fetchErrorReportInfosResponseValidator,
  },
  fetch_messages: { validator: fetchMessageInfosResponseValidator },
  fetch_pinned_messages: { validator: fetchPinnedMessagesResultValidator },
  fetch_primary_invite_links: { validator: fetchInviteLinksResponseValidator },
  fetch_thread_media: { validator: threadFetchMediaResultValidator },
  join_thread: { validator: threadJoinResultValidator },
  leave_thread: { validator: leaveThreadResultValidator },
  modify_community_role: { validator: roleModificationResultValidator },
  remove_members: { validator: changeThreadSettingsResultValidator },
  restore_entry: { validator: restoreEntryResponseValidator },
  search_users: { validator: userSearchResultValidator },
  send_password_reset_email: { validator: t.Nil },
  send_verification_email: { validator: t.Nil },
  set_thread_unread_status: { validator: setThreadUnreadStatusResultValidator },
  toggle_message_pin: { validator: toggleMessagePinResultValidator },
  update_account: { validator: t.Nil },
  update_user_settings: { validator: t.Nil },
  update_device_token: { validator: t.Nil },
  update_entry: { validator: saveEntryResponseValidator },
  update_relationships: { validator: relationshipErrorsValidator },
  update_relationships2: { validator: relationshipErrorsValidator },
  update_role: { validator: changeThreadSettingsResultValidator },
  update_thread: { validator: changeThreadSettingsResultValidator },
  update_user_subscription: { validator: subscriptionUpdateResponseValidator },
  verify_code: { validator: t.Nil },
  verify_invite_link: { validator: inviteLinkVerificationResponseValidator },
  siwe_nonce: { validator: siweNonceResponseValidator },
  siwe_auth: { validator: logInResponseValidator },
  claim_username: { validator: claimUsernameResponseValidator },
  update_user_avatar: { validator: updateUserAvatarResponderValidator },
  upload_media_metadata: { validator: uploadMultimediaResultValidator },
  search_messages: { validator: searchMessagesResponseValidator },
  get_olm_session_initialization_data: {
    validator: getOlmSessionInitializationDataResponseValidator,
  },
  version: { validator: versionResponseValidator },
  fetch_community_infos: { validator: fetchCommunityInfosResponseValidator },
  fetch_native_drawer_and_directory_infos: {
    validator: fetchNativeDrawerAndDirectoryInfosResponseValidator,
  },
  create_or_update_farcaster_channel_tag: {
    validator: createOrUpdateFarcasterChannelTagResponseValidator,
  },
  delete_farcaster_channel_tag: {
    validator: deleteFarcasterChannelTagResponseValidator,
  },
});

export const endpointValidators = Object.freeze({
  ...sessionChangingEndpoints,
  ...uploadEndpoints,
  ...largeDataFetchEndpoints,
  ...socketOnlyEndpoints,
  ...socketPreferredEndpoints,
  ...httpPreferredEndpoints,
});
