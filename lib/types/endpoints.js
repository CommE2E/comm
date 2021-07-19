// @flow

export type APIRequest = {
  endpoint: Endpoint,
  input: Object,
};
export type SocketAPIHandler = (request: APIRequest) => Promise<Object>;

export type Endpoint =
  | HTTPOnlyEndpoint
  | SocketOnlyEndpoint
  | HTTPPreferredEndpoint
  | SocketPreferredEndpoint;

// Endpoints that can cause session changes should occur over HTTP, since the
// socket code does not currently support changing sessions. In the future they
// could be made to work for native, but cookie changes on web require HTTP
// since websockets aren't able to Set-Cookie. Note that technically any
// endpoint can cause a sessionChange, and in that case the server will close
// the socket with a specific error code, and the client will proceed via HTTP.
const sessionChangingEndpoints = Object.freeze({
  LOG_OUT: 'log_out',
  DELETE_ACCOUNT: 'delete_account',
  CREATE_ACCOUNT: 'create_account',
  LOG_IN: 'log_in',
  UPDATE_PASSWORD: 'update_password',
});
type SessionChangingEndpoint = $Values<typeof sessionChangingEndpoints>;

// We do uploads over HTTP as well. This is because Websockets use TCP, which
// guarantees ordering. That means that if we start an upload, any messages we
// try to send the server after the upload starts will have to wait until the
// upload ends. To avoid blocking other messages we upload using HTTP
// multipart/form-data.
const uploadEndpoints = Object.freeze({
  UPLOAD_MULTIMEDIA: 'upload_multimedia',
});
type UploadEndpoint = $Values<typeof uploadEndpoints>;

type HTTPOnlyEndpoint = SessionChangingEndpoint | UploadEndpoint;

const socketOnlyEndpoints = Object.freeze({
  UPDATE_ACTIVITY: 'update_activity',
  UPDATE_CALENDAR_QUERY: 'update_calendar_query',
});
type SocketOnlyEndpoint = $Values<typeof socketOnlyEndpoints>;

const socketPreferredEndpoints = Object.freeze({
  UPDATE_USER_SUBSCRIPTION: 'update_user_subscription',
  UPDATE_DEVICE_TOKEN: 'update_device_token',
  UPDATE_ACCOUNT: 'update_account',
  SEND_VERIFICATION_EMAIL: 'send_verification_email',
  SEARCH_USERS: 'search_users',
  SEND_PASSWORD_RESET_EMAIL: 'send_password_reset_email',
  CREATE_TEXT_MESSAGE: 'create_text_message',
  FETCH_ENTRIES: 'fetch_entries',
  FETCH_ENTRY_REVISIONS: 'fetch_entry_revisions',
  VERIFY_CODE: 'verify_code',
  DELETE_THREAD: 'delete_thread',
  CREATE_ENTRY: 'create_entry',
  UPDATE_ENTRY: 'update_entry',
  DELETE_ENTRY: 'delete_entry',
  RESTORE_ENTRY: 'restore_entry',
  UPDATE_ROLE: 'update_role',
  REMOVE_MEMBERS: 'remove_members',
  LEAVE_THREAD: 'leave_thread',
  UPDATE_THREAD: 'update_thread',
  CREATE_THREAD: 'create_thread',
  FETCH_MESSAGES: 'fetch_messages',
  JOIN_THREAD: 'join_thread',
  SET_THREAD_UNREAD_STATUS: 'set_thread_unread_status',
  CREATE_ERROR_REPORT: 'create_error_report',
  FETCH_ERROR_REPORT_INFOS: 'fetch_error_report_infos',
  REQUEST_ACCESS: 'request_access',
  CREATE_MULTIMEDIA_MESSAGE: 'create_multimedia_message',
  DELETE_UPLOAD: 'delete_upload',
  UPDATE_RELATIONSHIPS: 'update_relationships',
  GET_USER_PUBLIC_KEYS: 'get_user_public_keys',
});
type SocketPreferredEndpoint = $Values<typeof socketPreferredEndpoints>;

const httpPreferredEndpoints = Object.freeze({
  CREATE_REPORT: 'create_report',
  CREATE_REPORTS: 'create_reports',
});
type HTTPPreferredEndpoint = $Values<typeof httpPreferredEndpoints>;

const socketPreferredEndpointSet = new Set([
  ...Object.values(socketOnlyEndpoints),
  ...Object.values(socketPreferredEndpoints),
]);
export function endpointIsSocketPreferred(endpoint: Endpoint): boolean {
  return socketPreferredEndpointSet.has(endpoint);
}

const socketSafeEndpointSet = new Set([
  ...Object.values(socketOnlyEndpoints),
  ...Object.values(socketPreferredEndpoints),
  ...Object.values(httpPreferredEndpoints),
]);
export function endpointIsSocketSafe(endpoint: Endpoint): boolean {
  return socketSafeEndpointSet.has(endpoint);
}

const socketOnlyEndpointSet = new Set(Object.values(socketOnlyEndpoints));
export function endpointIsSocketOnly(endpoint: Endpoint): boolean {
  return socketOnlyEndpointSet.has(endpoint);
}
