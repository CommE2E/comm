// @flow

import { baseLegalPolicies } from 'lib/facts/policies.js';
import type { Endpoint } from 'lib/types/endpoints.js';

import {
  updateActivityResponder,
  threadSetUnreadStatusResponder,
} from './responders/activity-responders.js';
import { deviceTokenUpdateResponder } from './responders/device-responders.js';
import {
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
  calendarQueryUpdateResponder,
} from './responders/entry-responders.js';
import type { JSONResponder } from './responders/handlers.js';
import {
  getSessionPublicKeysResponder,
  getOlmSessionInitializationDataResponder,
} from './responders/keys-responders.js';
import {
  createOrUpdatePublicLinkResponder,
  disableInviteLinkResponder,
  fetchPrimaryInviteLinksResponder,
  inviteLinkVerificationResponder,
} from './responders/link-responders.js';
import { messageReportCreationResponder } from './responders/message-report-responder.js';
import {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
  reactionMessageCreationResponder,
  editMessageCreationResponder,
  fetchPinnedMessagesResponder,
  searchMessagesResponder,
} from './responders/message-responders.js';
import { updateRelationshipsResponder } from './responders/relationship-responders.js';
import {
  reportCreationResponder,
  reportMultiCreationResponder,
  errorReportFetchInfosResponder,
} from './responders/report-responders.js';
import {
  userSearchResponder,
  exactUserSearchResponder,
} from './responders/search-responders.js';
import { siweNonceResponder } from './responders/siwe-nonce-responders.js';
import {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadFetchMediaResponder,
  threadJoinResponder,
  toggleMessagePinResponder,
  roleModificationResponder,
  roleDeletionResponder,
} from './responders/thread-responders.js';
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
  updateUserAvatarResponder,
} from './responders/user-responders.js';
import { codeVerificationResponder } from './responders/verification-responders.js';
import { versionResponder } from './responders/version-responders.js';
import {
  uploadMediaMetadataResponder,
  uploadDeletionResponder,
} from './uploads/uploads.js';

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
  create_or_update_public_link: {
    responder: createOrUpdatePublicLinkResponder,
    requiredPolicies: baseLegalPolicies,
  },
  create_reaction_message: {
    responder: reactionMessageCreationResponder,
    requiredPolicies: baseLegalPolicies,
  },
  disable_invite_link: {
    responder: disableInviteLinkResponder,
    requiredPolicies: baseLegalPolicies,
  },
  edit_message: {
    responder: editMessageCreationResponder,
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
  delete_community_role: {
    responder: roleDeletionResponder,
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
  exact_search_user: {
    responder: exactUserSearchResponder,
    requiredPolicies: [],
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
  fetch_pinned_messages: {
    responder: fetchPinnedMessagesResponder,
    requiredPolicies: baseLegalPolicies,
  },
  fetch_primary_invite_links: {
    responder: fetchPrimaryInviteLinksResponder,
    requiredPolicies: baseLegalPolicies,
  },
  fetch_thread_media: {
    responder: threadFetchMediaResponder,
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
  modify_community_role: {
    responder: roleModificationResponder,
    requiredPolicies: baseLegalPolicies,
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
  search_messages: {
    responder: searchMessagesResponder,
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
  toggle_message_pin: {
    responder: toggleMessagePinResponder,
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
  verify_invite_link: {
    responder: inviteLinkVerificationResponder,
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
  update_user_avatar: {
    responder: updateUserAvatarResponder,
    requiredPolicies: baseLegalPolicies,
  },
  upload_media_metadata: {
    responder: uploadMediaMetadataResponder,
    requiredPolicies: baseLegalPolicies,
  },
  get_olm_session_initialization_data: {
    responder: getOlmSessionInitializationDataResponder,
    requiredPolicies: [],
  },
  version: {
    responder: versionResponder,
    requiredPolicies: [],
  },
};

export { jsonEndpoints };
