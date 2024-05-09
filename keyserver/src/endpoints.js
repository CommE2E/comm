// @flow

import t from 'tcomb';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import {
  setThreadUnreadStatusResultValidator,
  updateActivityResultValidator,
} from 'lib/types/activity-types.js';
import type { Endpoint } from 'lib/types/endpoints.js';
import { inviteLinkValidator } from 'lib/types/link-types.js';
import { uploadMultimediaResultValidator } from 'lib/types/media-types.js';
import { getOlmSessionInitializationDataResponseValidator } from 'lib/types/request-types.js';
import {
  saveEntryResponseValidator,
  deleteEntryResponseValidator,
  fetchEntryInfosResponseValidator,
  fetchEntryRevisionInfosResultValidator,
  deltaEntryInfosResultValidator,
  restoreEntryResponseValidator,
} from 'lib/types/validators/entry-validators.js';
import { createOrUpdateFarcasterChannelTagResponseValidator } from 'lib/types/validators/farcaster-channel-tag-validators.js';
import {
  fetchInviteLinksResponseValidator,
  inviteLinkVerificationResponseValidator,
} from 'lib/types/validators/link-validators.js';
import { messageReportCreationResultValidator } from 'lib/types/validators/message-report-validators.js';
import {
  fetchMessageInfosResponseValidator,
  fetchPinnedMessagesResultValidator,
  searchMessagesResponseValidator,
  sendEditMessageResponseValidator,
  sendMessageResponseValidator,
} from 'lib/types/validators/message-validators.js';
import { initialReduxStateValidator } from 'lib/types/validators/redux-state-validators.js';
import { relationshipErrorsValidator } from 'lib/types/validators/relationship-validators.js';
import {
  fetchErrorReportInfosResponseValidator,
  reportCreationResponseValidator,
} from 'lib/types/validators/report-validators.js';
import {
  exactUserSearchResultValidator,
  userSearchResultValidator,
} from 'lib/types/validators/search-validators.js';
import { siweNonceResponseValidator } from 'lib/types/validators/siwe-nonce-validators.js';
import {
  changeThreadSettingsResultValidator,
  leaveThreadResultValidator,
  newThreadResponseValidator,
  threadFetchMediaResultValidator,
  threadJoinResultValidator,
  toggleMessagePinResultValidator,
  roleModificationResultValidator,
  roleDeletionResultValidator,
} from 'lib/types/validators/thread-validators.js';
import {
  logInResponseValidator,
  registerResponseValidator,
  logOutResponseValidator,
  claimUsernameResponseValidator,
  subscriptionUpdateResponseValidator,
  updateUserAvatarResponderValidator,
} from 'lib/types/validators/user-validators.js';
import { versionResponseValidator } from 'lib/types/validators/version-validators.js';
import { updateUserAvatarRequestValidator } from 'lib/utils/avatar-utils.js';

import {
  updateActivityResponder,
  threadSetUnreadStatusResponder,
  setThreadUnreadStatusValidator,
  updateActivityResponderInputValidator,
} from './responders/activity-responders.js';
import {
  fetchCommunityInfosResponder,
  fetchCommunityInfosResponseValidator,
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
  newEntryQueryInputValidator,
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
} from './responders/user-responders.js';
import {
  codeVerificationResponder,
  codeVerificationRequestInputValidator,
} from './responders/verification-responders.js';
import { versionResponder } from './responders/version-responders.js';
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

const jsonEndpoints: { [id: Endpoint]: JSONResponder } = {
  create_account: createJSONResponder(
    accountCreationResponder,
    registerRequestInputValidator,
    registerResponseValidator,
    [],
  ),
  create_entry: createJSONResponder(
    entryCreationResponder,
    createEntryRequestInputValidator,
    saveEntryResponseValidator,
    baseLegalPolicies,
  ),
  create_error_report: createJSONResponder(
    reportCreationResponder,
    reportCreationRequestInputValidator,
    reportCreationResponseValidator,
    [],
  ),
  create_message_report: createJSONResponder(
    messageReportCreationResponder,
    messageReportCreationRequestInputValidator,
    messageReportCreationResultValidator,
    baseLegalPolicies,
  ),
  create_multimedia_message: createJSONResponder(
    multimediaMessageCreationResponder,
    sendMultimediaMessageRequestInputValidator,
    sendMessageResponseValidator,
    baseLegalPolicies,
  ),
  create_or_update_public_link: createJSONResponder(
    createOrUpdatePublicLinkResponder,
    createOrUpdatePublicLinkInputValidator,
    inviteLinkValidator,
    baseLegalPolicies,
  ),
  create_reaction_message: createJSONResponder(
    reactionMessageCreationResponder,
    sendReactionMessageRequestInputValidator,
    sendMessageResponseValidator,
    baseLegalPolicies,
  ),
  disable_invite_link: createJSONResponder(
    disableInviteLinkResponder,
    disableInviteLinkInputValidator,
    t.Nil,
    baseLegalPolicies,
  ),
  edit_message: createJSONResponder(
    editMessageCreationResponder,
    editMessageRequestInputValidator,
    sendEditMessageResponseValidator,
    baseLegalPolicies,
  ),
  create_report: createJSONResponder(
    reportCreationResponder,
    reportCreationRequestInputValidator,
    reportCreationResponseValidator,
    [],
  ),
  create_reports: createJSONResponder(
    reportMultiCreationResponder,
    reportMultiCreationRequestInputValidator,
    t.Nil,
    [],
  ),
  create_text_message: createJSONResponder(
    textMessageCreationResponder,
    sendTextMessageRequestInputValidator,
    sendMessageResponseValidator,
    baseLegalPolicies,
  ),
  create_thread: createJSONResponder(
    threadCreationResponder,
    newThreadRequestInputValidator,
    newThreadResponseValidator,
    baseLegalPolicies,
  ),
  delete_account: createJSONResponder(
    accountDeletionResponder,
    ignoredArgumentValidator,
    logOutResponseValidator,
    [],
  ),
  delete_entry: createJSONResponder(
    entryDeletionResponder,
    deleteEntryRequestInputValidator,
    deleteEntryResponseValidator,
    baseLegalPolicies,
  ),
  delete_community_role: createJSONResponder(
    roleDeletionResponder,
    roleDeletionRequestInputValidator,
    roleDeletionResultValidator,
    baseLegalPolicies,
  ),
  delete_thread: createJSONResponder(
    threadDeletionResponder,
    threadDeletionRequestInputValidator,
    leaveThreadResultValidator,
    baseLegalPolicies,
  ),
  delete_upload: createJSONResponder(
    uploadDeletionResponder,
    UploadDeletionRequestInputValidator,
    t.Nil,
    baseLegalPolicies,
  ),
  exact_search_user: createJSONResponder(
    exactUserSearchResponder,
    exactUserSearchRequestInputValidator,
    exactUserSearchResultValidator,
    [],
  ),
  fetch_entries: createJSONResponder(
    entryFetchResponder,
    entryQueryInputValidator,
    fetchEntryInfosResponseValidator,
    baseLegalPolicies,
  ),
  fetch_entry_revisions: createJSONResponder(
    entryRevisionFetchResponder,
    entryRevisionHistoryFetchInputValidator,
    fetchEntryRevisionInfosResultValidator,
    baseLegalPolicies,
  ),
  fetch_error_report_infos: createJSONResponder(
    errorReportFetchInfosResponder,
    fetchErrorReportInfosRequestInputValidator,
    fetchErrorReportInfosResponseValidator,
    baseLegalPolicies,
  ),
  fetch_messages: createJSONResponder(
    messageFetchResponder,
    fetchMessageInfosRequestInputValidator,
    fetchMessageInfosResponseValidator,
    baseLegalPolicies,
  ),
  fetch_pinned_messages: createJSONResponder(
    fetchPinnedMessagesResponder,
    fetchPinnedMessagesResponderInputValidator,
    fetchPinnedMessagesResultValidator,
    baseLegalPolicies,
  ),
  fetch_primary_invite_links: createJSONResponder(
    fetchPrimaryInviteLinksResponder,
    ignoredArgumentValidator,
    fetchInviteLinksResponseValidator,
    baseLegalPolicies,
  ),
  fetch_thread_media: createJSONResponder(
    threadFetchMediaResponder,
    threadFetchMediaRequestInputValidator,
    threadFetchMediaResultValidator,
    baseLegalPolicies,
  ),
  get_initial_redux_state: createJSONResponder(
    getInitialReduxStateResponder,
    initialReduxStateRequestValidator,
    initialReduxStateValidator,
    [],
  ),
  join_thread: createJSONResponder(
    threadJoinResponder,
    joinThreadRequestInputValidator,
    threadJoinResultValidator,
    baseLegalPolicies,
  ),
  keyserver_auth: createJSONResponder(
    keyserverAuthResponder,
    keyserverAuthRequestInputValidator,
    logInResponseValidator,
    [],
  ),
  leave_thread: createJSONResponder(
    threadLeaveResponder,
    leaveThreadRequestInputValidator,
    leaveThreadResultValidator,
    baseLegalPolicies,
  ),
  log_in: createJSONResponder(
    logInResponder,
    logInRequestInputValidator,
    logInResponseValidator,
    [],
  ),
  log_out: createJSONResponder(
    logOutResponder,
    ignoredArgumentValidator,
    logOutResponseValidator,
    [],
  ),
  modify_community_role: createJSONResponder(
    roleModificationResponder,
    roleModificationRequestInputValidator,
    roleModificationResultValidator,
    baseLegalPolicies,
  ),
  policy_acknowledgment: createJSONResponder(
    policyAcknowledgmentResponder,
    policyAcknowledgmentRequestInputValidator,
    t.Nil,
    [],
  ),
  remove_members: createJSONResponder(
    memberRemovalResponder,
    removeMembersRequestInputValidator,
    changeThreadSettingsResultValidator,
    baseLegalPolicies,
  ),
  restore_entry: createJSONResponder(
    entryRestorationResponder,
    restoreEntryRequestInputValidator,
    restoreEntryResponseValidator,
    baseLegalPolicies,
  ),
  search_messages: createJSONResponder(
    searchMessagesResponder,
    searchMessagesResponderInputValidator,
    searchMessagesResponseValidator,
    baseLegalPolicies,
  ),
  search_users: createJSONResponder(
    userSearchResponder,
    userSearchRequestInputValidator,
    userSearchResultValidator,
    baseLegalPolicies,
  ),
  send_password_reset_email: createJSONResponder(
    sendPasswordResetEmailResponder,
    resetPasswordRequestInputValidator,
    t.Nil,
    [],
  ),
  send_verification_email: createJSONResponder(
    sendVerificationEmailResponder,
    ignoredArgumentValidator,
    t.Nil,
    [],
  ),
  set_thread_unread_status: createJSONResponder(
    threadSetUnreadStatusResponder,
    setThreadUnreadStatusValidator,
    setThreadUnreadStatusResultValidator,
    baseLegalPolicies,
  ),
  toggle_message_pin: createJSONResponder(
    toggleMessagePinResponder,
    toggleMessagePinRequestInputValidator,
    toggleMessagePinResultValidator,
    baseLegalPolicies,
  ),
  update_account: createJSONResponder(
    passwordUpdateResponder,
    accountUpdateInputValidator,
    t.Nil,
    baseLegalPolicies,
  ),
  update_activity: createJSONResponder(
    updateActivityResponder,
    updateActivityResponderInputValidator,
    updateActivityResultValidator,
    baseLegalPolicies,
  ),
  update_calendar_query: createJSONResponder(
    calendarQueryUpdateResponder,
    newEntryQueryInputValidator,
    deltaEntryInfosResultValidator,
    baseLegalPolicies,
  ),
  update_user_settings: createJSONResponder(
    updateUserSettingsResponder,
    updateUserSettingsInputValidator,
    t.Nil,
    baseLegalPolicies,
  ),
  update_device_token: createJSONResponder(
    deviceTokenUpdateResponder,
    deviceTokenUpdateRequestInputValidator,
    t.Nil,
    [],
  ),
  update_entry: createJSONResponder(
    entryUpdateResponder,
    saveEntryRequestInputValidator,
    saveEntryResponseValidator,
    baseLegalPolicies,
  ),
  update_password: createJSONResponder(
    oldPasswordUpdateResponder,
    updatePasswordRequestInputValidator,
    logInResponseValidator,
    baseLegalPolicies,
  ),
  update_relationships: createJSONResponder(
    updateRelationshipsResponder,
    updateRelationshipInputValidator,
    relationshipErrorsValidator,
    baseLegalPolicies,
  ),
  update_role: createJSONResponder(
    roleUpdateResponder,
    roleChangeRequestInputValidator,
    changeThreadSettingsResultValidator,
    baseLegalPolicies,
  ),
  update_thread: createJSONResponder(
    threadUpdateResponder,
    updateThreadRequestInputValidator,
    changeThreadSettingsResultValidator,
    baseLegalPolicies,
  ),
  update_user_subscription: createJSONResponder(
    userSubscriptionUpdateResponder,
    subscriptionUpdateRequestInputValidator,
    subscriptionUpdateResponseValidator,
    baseLegalPolicies,
  ),
  verify_code: createJSONResponder(
    codeVerificationResponder,
    codeVerificationRequestInputValidator,
    t.Nil,
    baseLegalPolicies,
  ),
  verify_invite_link: createJSONResponder(
    inviteLinkVerificationResponder,
    inviteLinkVerificationRequestInputValidator,
    inviteLinkVerificationResponseValidator,
    baseLegalPolicies,
  ),
  siwe_nonce: createJSONResponder(
    siweNonceResponder,
    ignoredArgumentValidator,
    siweNonceResponseValidator,
    [],
  ),
  siwe_auth: createJSONResponder(
    siweAuthResponder,
    siweAuthRequestInputValidator,
    logInResponseValidator,
    [],
  ),
  claim_username: createJSONResponder(
    claimUsernameResponder,
    ignoredArgumentValidator,
    claimUsernameResponseValidator,
    [],
  ),
  update_user_avatar: createJSONResponder(
    updateUserAvatarResponder,
    updateUserAvatarRequestValidator,
    updateUserAvatarResponderValidator,
    baseLegalPolicies,
  ),
  upload_media_metadata: createJSONResponder(
    uploadMediaMetadataResponder,
    uploadMediaMetadataInputValidator,
    uploadMultimediaResultValidator,
    baseLegalPolicies,
  ),
  get_olm_session_initialization_data: createJSONResponder(
    getOlmSessionInitializationDataResponder,
    ignoredArgumentValidator,
    getOlmSessionInitializationDataResponseValidator,
    [],
  ),
  version: createJSONResponder(
    versionResponder,
    ignoredArgumentValidator,
    versionResponseValidator,
    [],
  ),
  fetch_community_infos: createJSONResponder(
    fetchCommunityInfosResponder,
    ignoredArgumentValidator,
    fetchCommunityInfosResponseValidator,
    baseLegalPolicies,
  ),
  create_or_update_farcaster_channel_tag: createJSONResponder(
    createOrUpdateFarcasterChannelTagResponder,
    createOrUpdateFarcasterChannelTagInputValidator,
    createOrUpdateFarcasterChannelTagResponseValidator,
    baseLegalPolicies,
  ),
  delete_farcaster_channel_tag: createJSONResponder(
    deleteFarcasterChannelTagResponder,
    deleteFarcasterChannelTagInputValidator,
    t.Nil,
    baseLegalPolicies,
  ),
};

export { jsonEndpoints };
