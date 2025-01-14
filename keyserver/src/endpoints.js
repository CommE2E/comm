// @flow

import t from 'tcomb';
import type { TType } from 'tcomb';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import type { PolicyType } from 'lib/facts/policies.js';
import type { Endpoint } from 'lib/types/endpoints.js';
import { calendarQueryValidator } from 'lib/types/entry-types.js';
import { sessionStateValidator } from 'lib/types/session-types.js';
import { endpointValidators } from 'lib/types/validators/endpoint-validators.js';
import { updateUserAvatarRequestValidator } from 'lib/utils/avatar-utils.js';

import {
  updateActivityResponder,
  threadSetUnreadStatusResponder,
  setThreadUnreadStatusValidator,
  updateActivityResponderInputValidator,
} from './responders/activity-responders.js';
import {
  fetchCommunityInfosResponder,
  fetchNativeDrawerAndDirectoryInfosResponder,
} from './responders/community-responders.js';
import {
  deviceTokenUpdateResponder,
  deviceTokenUpdateRequestInputValidator,
} from './responders/device-responders.js';
import {
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
  calendarQueryUpdateResponder,
  createEntryRequestInputValidator,
  deleteEntryRequestInputValidator,
  entryQueryInputValidator,
  entryRevisionHistoryFetchInputValidator,
  restoreEntryRequestInputValidator,
  saveEntryRequestInputValidator,
} from './responders/entry-responders.js';
import {
  createOrUpdateFarcasterChannelTagResponder,
  deleteFarcasterChannelTagResponder,
  createOrUpdateFarcasterChannelTagInputValidator,
  deleteFarcasterChannelTagInputValidator,
} from './responders/farcaster-channel-tag-responders.js';
import type { JSONResponder } from './responders/handlers.js';
import { createJSONResponder } from './responders/handlers.js';
import { getOlmSessionInitializationDataResponder } from './responders/keys-responders.js';
import {
  createOrUpdatePublicLinkResponder,
  disableInviteLinkResponder,
  fetchPrimaryInviteLinksResponder,
  inviteLinkVerificationResponder,
  createOrUpdatePublicLinkInputValidator,
  disableInviteLinkInputValidator,
  inviteLinkVerificationRequestInputValidator,
} from './responders/link-responders.js';
import {
  messageReportCreationResponder,
  messageReportCreationRequestInputValidator,
} from './responders/message-report-responder.js';
import {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
  reactionMessageCreationResponder,
  editMessageCreationResponder,
  fetchPinnedMessagesResponder,
  searchMessagesResponder,
  sendMultimediaMessageRequestInputValidator,
  sendReactionMessageRequestInputValidator,
  editMessageRequestInputValidator,
  sendTextMessageRequestInputValidator,
  fetchMessageInfosRequestInputValidator,
  fetchPinnedMessagesResponderInputValidator,
  searchMessagesResponderInputValidator,
} from './responders/message-responders.js';
import {
  getInitialReduxStateResponder,
  initialReduxStateRequestValidator,
} from './responders/redux-state-responders.js';
import {
  legacyUpdateRelationshipsResponder,
  legacyUpdateRelationshipInputValidator,
  updateRelationshipsResponder,
  updateRelationshipInputValidator,
} from './responders/relationship-responders.js';
import {
  reportCreationResponder,
  reportMultiCreationResponder,
  errorReportFetchInfosResponder,
  reportCreationRequestInputValidator,
  fetchErrorReportInfosRequestInputValidator,
  reportMultiCreationRequestInputValidator,
} from './responders/report-responders.js';
import {
  userSearchResponder,
  exactUserSearchResponder,
  exactUserSearchRequestInputValidator,
  userSearchRequestInputValidator,
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
  newThreadRequestInputValidator,
  threadDeletionRequestInputValidator,
  joinThreadRequestInputValidator,
  leaveThreadRequestInputValidator,
  threadFetchMediaRequestInputValidator,
  removeMembersRequestInputValidator,
  roleChangeRequestInputValidator,
  toggleMessagePinRequestInputValidator,
  updateThreadRequestInputValidator,
  roleDeletionRequestInputValidator,
  roleModificationRequestInputValidator,
} from './responders/thread-responders.js';
import { fetchPendingUpdatesResponder } from './responders/update-responders.js';
import {
  keyserverAuthRequestInputValidator,
  keyserverAuthResponder,
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
  registerRequestInputValidator,
  logInRequestInputValidator,
  policyAcknowledgmentRequestInputValidator,
  accountUpdateInputValidator,
  resetPasswordRequestInputValidator,
  siweAuthRequestInputValidator,
  subscriptionUpdateRequestInputValidator,
  updatePasswordRequestInputValidator,
  updateUserSettingsInputValidator,
  claimUsernameResponder,
  claimUsernameRequestInputValidator,
} from './responders/user-responders.js';
import {
  codeVerificationResponder,
  codeVerificationRequestInputValidator,
} from './responders/verification-responders.js';
import { versionResponder } from './responders/version-responders.js';
import type { Viewer } from './session/viewer.js';
import {
  uploadMediaMetadataResponder,
  uploadDeletionResponder,
  UploadDeletionRequestInputValidator,
  uploadMediaMetadataInputValidator,
} from './uploads/uploads.js';

const ignoredArgumentValidator = t.irreducible<mixed>(
  'Ignored argument',
  () => true,
);

type EndpointData = {
  responder: (viewer: Viewer, input: any) => Promise<*>,
  inputValidator: TType<*>,
  policies: $ReadOnlyArray<PolicyType>,
};

const jsonEndpointsData: { +[id: Endpoint]: EndpointData } = {
  create_account: {
    responder: accountCreationResponder,
    inputValidator: registerRequestInputValidator,
    policies: [],
  },
  create_entry: {
    responder: entryCreationResponder,
    inputValidator: createEntryRequestInputValidator,
    policies: baseLegalPolicies,
  },
  create_error_report: {
    responder: reportCreationResponder,
    inputValidator: reportCreationRequestInputValidator,
    policies: [],
  },
  create_message_report: {
    responder: messageReportCreationResponder,
    inputValidator: messageReportCreationRequestInputValidator,
    policies: baseLegalPolicies,
  },
  create_multimedia_message: {
    responder: multimediaMessageCreationResponder,
    inputValidator: sendMultimediaMessageRequestInputValidator,
    policies: baseLegalPolicies,
  },
  create_or_update_public_link: {
    responder: createOrUpdatePublicLinkResponder,
    inputValidator: createOrUpdatePublicLinkInputValidator,
    policies: baseLegalPolicies,
  },
  create_reaction_message: {
    responder: reactionMessageCreationResponder,
    inputValidator: sendReactionMessageRequestInputValidator,
    policies: baseLegalPolicies,
  },
  disable_invite_link: {
    responder: disableInviteLinkResponder,
    inputValidator: disableInviteLinkInputValidator,
    policies: baseLegalPolicies,
  },
  edit_message: {
    responder: editMessageCreationResponder,
    inputValidator: editMessageRequestInputValidator,
    policies: baseLegalPolicies,
  },
  create_report: {
    responder: reportCreationResponder,
    inputValidator: reportCreationRequestInputValidator,
    policies: [],
  },
  create_reports: {
    responder: reportMultiCreationResponder,
    inputValidator: reportMultiCreationRequestInputValidator,
    policies: [],
  },
  create_text_message: {
    responder: textMessageCreationResponder,
    inputValidator: sendTextMessageRequestInputValidator,
    policies: baseLegalPolicies,
  },
  create_thread: {
    responder: threadCreationResponder,
    inputValidator: newThreadRequestInputValidator,
    policies: baseLegalPolicies,
  },
  delete_account: {
    responder: accountDeletionResponder,
    inputValidator: ignoredArgumentValidator,
    policies: [],
  },
  delete_entry: {
    responder: entryDeletionResponder,
    inputValidator: deleteEntryRequestInputValidator,
    policies: baseLegalPolicies,
  },
  delete_community_role: {
    responder: roleDeletionResponder,
    inputValidator: roleDeletionRequestInputValidator,
    policies: baseLegalPolicies,
  },
  delete_thread: {
    responder: threadDeletionResponder,
    inputValidator: threadDeletionRequestInputValidator,
    policies: baseLegalPolicies,
  },
  delete_upload: {
    responder: uploadDeletionResponder,
    inputValidator: UploadDeletionRequestInputValidator,
    policies: baseLegalPolicies,
  },
  exact_search_user: {
    responder: exactUserSearchResponder,
    inputValidator: exactUserSearchRequestInputValidator,
    policies: [],
  },
  fetch_entries: {
    responder: entryFetchResponder,
    inputValidator: entryQueryInputValidator,
    policies: baseLegalPolicies,
  },
  fetch_entry_revisions: {
    responder: entryRevisionFetchResponder,
    inputValidator: entryRevisionHistoryFetchInputValidator,
    policies: baseLegalPolicies,
  },
  fetch_error_report_infos: {
    responder: errorReportFetchInfosResponder,
    inputValidator: fetchErrorReportInfosRequestInputValidator,
    policies: baseLegalPolicies,
  },
  fetch_messages: {
    responder: messageFetchResponder,
    inputValidator: fetchMessageInfosRequestInputValidator,
    policies: baseLegalPolicies,
  },
  fetch_pending_updates: {
    responder: fetchPendingUpdatesResponder,
    inputValidator: sessionStateValidator,
    policies: baseLegalPolicies,
  },
  fetch_pinned_messages: {
    responder: fetchPinnedMessagesResponder,
    inputValidator: fetchPinnedMessagesResponderInputValidator,
    policies: baseLegalPolicies,
  },
  fetch_primary_invite_links: {
    responder: fetchPrimaryInviteLinksResponder,
    inputValidator: ignoredArgumentValidator,
    policies: baseLegalPolicies,
  },
  fetch_thread_media: {
    responder: threadFetchMediaResponder,
    inputValidator: threadFetchMediaRequestInputValidator,
    policies: baseLegalPolicies,
  },
  get_initial_redux_state: {
    responder: getInitialReduxStateResponder,
    inputValidator: initialReduxStateRequestValidator,
    policies: [],
  },
  join_thread: {
    responder: threadJoinResponder,
    inputValidator: joinThreadRequestInputValidator,
    policies: baseLegalPolicies,
  },
  keyserver_auth: {
    responder: keyserverAuthResponder,
    inputValidator: keyserverAuthRequestInputValidator,
    policies: [],
  },
  leave_thread: {
    responder: threadLeaveResponder,
    inputValidator: leaveThreadRequestInputValidator,
    policies: baseLegalPolicies,
  },
  log_in: {
    responder: logInResponder,
    inputValidator: logInRequestInputValidator,
    policies: [],
  },
  log_out: {
    responder: logOutResponder,
    inputValidator: ignoredArgumentValidator,
    policies: [],
  },
  modify_community_role: {
    responder: roleModificationResponder,
    inputValidator: roleModificationRequestInputValidator,
    policies: baseLegalPolicies,
  },
  policy_acknowledgment: {
    responder: policyAcknowledgmentResponder,
    inputValidator: policyAcknowledgmentRequestInputValidator,
    policies: [],
  },
  remove_members: {
    responder: memberRemovalResponder,
    inputValidator: removeMembersRequestInputValidator,
    policies: baseLegalPolicies,
  },
  restore_entry: {
    responder: entryRestorationResponder,
    inputValidator: restoreEntryRequestInputValidator,
    policies: baseLegalPolicies,
  },
  search_messages: {
    responder: searchMessagesResponder,
    inputValidator: searchMessagesResponderInputValidator,
    policies: baseLegalPolicies,
  },
  search_users: {
    responder: userSearchResponder,
    inputValidator: userSearchRequestInputValidator,
    policies: baseLegalPolicies,
  },
  send_password_reset_email: {
    responder: sendPasswordResetEmailResponder,
    inputValidator: resetPasswordRequestInputValidator,
    policies: [],
  },
  send_verification_email: {
    responder: sendVerificationEmailResponder,
    inputValidator: ignoredArgumentValidator,
    policies: [],
  },
  set_thread_unread_status: {
    responder: threadSetUnreadStatusResponder,
    inputValidator: setThreadUnreadStatusValidator,
    policies: baseLegalPolicies,
  },
  toggle_message_pin: {
    responder: toggleMessagePinResponder,
    inputValidator: toggleMessagePinRequestInputValidator,
    policies: baseLegalPolicies,
  },
  update_account: {
    responder: passwordUpdateResponder,
    inputValidator: accountUpdateInputValidator,
    policies: baseLegalPolicies,
  },
  update_activity: {
    responder: updateActivityResponder,
    inputValidator: updateActivityResponderInputValidator,
    policies: baseLegalPolicies,
  },
  update_calendar_query: {
    responder: calendarQueryUpdateResponder,
    inputValidator: calendarQueryValidator,
    policies: baseLegalPolicies,
  },
  update_user_settings: {
    responder: updateUserSettingsResponder,
    inputValidator: updateUserSettingsInputValidator,
    policies: baseLegalPolicies,
  },
  update_device_token: {
    responder: deviceTokenUpdateResponder,
    inputValidator: deviceTokenUpdateRequestInputValidator,
    policies: [],
  },
  update_entry: {
    responder: entryUpdateResponder,
    inputValidator: saveEntryRequestInputValidator,
    policies: baseLegalPolicies,
  },
  update_password: {
    responder: oldPasswordUpdateResponder,
    inputValidator: updatePasswordRequestInputValidator,
    policies: baseLegalPolicies,
  },
  update_relationships: {
    responder: legacyUpdateRelationshipsResponder,
    inputValidator: legacyUpdateRelationshipInputValidator,
    policies: baseLegalPolicies,
  },
  update_relationships2: {
    responder: updateRelationshipsResponder,
    inputValidator: updateRelationshipInputValidator,
    policies: baseLegalPolicies,
  },
  update_role: {
    responder: roleUpdateResponder,
    inputValidator: roleChangeRequestInputValidator,
    policies: baseLegalPolicies,
  },
  update_thread: {
    responder: threadUpdateResponder,
    inputValidator: updateThreadRequestInputValidator,
    policies: baseLegalPolicies,
  },
  update_user_subscription: {
    responder: userSubscriptionUpdateResponder,
    inputValidator: subscriptionUpdateRequestInputValidator,
    policies: baseLegalPolicies,
  },
  verify_code: {
    responder: codeVerificationResponder,
    inputValidator: codeVerificationRequestInputValidator,
    policies: baseLegalPolicies,
  },
  verify_invite_link: {
    responder: inviteLinkVerificationResponder,
    inputValidator: inviteLinkVerificationRequestInputValidator,
    policies: baseLegalPolicies,
  },
  siwe_nonce: {
    responder: siweNonceResponder,
    inputValidator: ignoredArgumentValidator,
    policies: [],
  },
  siwe_auth: {
    responder: siweAuthResponder,
    inputValidator: siweAuthRequestInputValidator,
    policies: [],
  },
  claim_username: {
    responder: claimUsernameResponder,
    inputValidator: claimUsernameRequestInputValidator,
    policies: [],
  },
  update_user_avatar: {
    responder: updateUserAvatarResponder,
    inputValidator: updateUserAvatarRequestValidator,
    policies: baseLegalPolicies,
  },
  upload_media_metadata: {
    responder: uploadMediaMetadataResponder,
    inputValidator: uploadMediaMetadataInputValidator,
    policies: baseLegalPolicies,
  },
  get_olm_session_initialization_data: {
    responder: getOlmSessionInitializationDataResponder,
    inputValidator: ignoredArgumentValidator,
    policies: [],
  },
  version: {
    responder: versionResponder,
    inputValidator: ignoredArgumentValidator,
    policies: [],
  },
  fetch_community_infos: {
    responder: fetchCommunityInfosResponder,
    inputValidator: ignoredArgumentValidator,
    policies: baseLegalPolicies,
  },
  fetch_native_drawer_and_directory_infos: {
    responder: fetchNativeDrawerAndDirectoryInfosResponder,
    inputValidator: ignoredArgumentValidator,
    policies: baseLegalPolicies,
  },
  create_or_update_farcaster_channel_tag: {
    responder: createOrUpdateFarcasterChannelTagResponder,
    inputValidator: createOrUpdateFarcasterChannelTagInputValidator,
    policies: baseLegalPolicies,
  },
  delete_farcaster_channel_tag: {
    responder: deleteFarcasterChannelTagResponder,
    inputValidator: deleteFarcasterChannelTagInputValidator,
    policies: baseLegalPolicies,
  },
};

function createJSONResponders(obj: { +[Endpoint]: EndpointData }): {
  +[Endpoint]: JSONResponder,
} {
  const result: { [Endpoint]: JSONResponder } = {};

  Object.keys(obj).forEach((endpoint: Endpoint) => {
    const responder = createJSONResponder(
      obj[endpoint].responder,
      obj[endpoint].inputValidator,
      endpointValidators[endpoint].validator,
      obj[endpoint].policies,
      endpoint,
    );
    result[endpoint] = responder;
  });

  return result;
}

const jsonEndpoints: { +[Endpoint]: JSONResponder } =
  createJSONResponders(jsonEndpointsData);

export { jsonEndpoints };
