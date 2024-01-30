// @flow

import type { TUnion } from 'tcomb';
import t from 'tcomb';

import {
  type AuthMessage,
  authMessageValidator,
} from './auth-message-types.js';
import {
  type SearchQuery,
  searchQueryValidator,
} from './search-query-types.js';
import {
  type SearchResult,
  searchResultValidator,
} from './search-result-types.js';
import {
  type ConnectionInitializationResponse,
  connectionInitializationResponseValidator,
} from '../websocket/connection-initialization-response-types.js';
import {
  type Heartbeat,
  heartbeatValidator,
} from '../websocket/heartbeat-types.js';

export const identitySearchMessageTypes = Object.freeze({
  AUTH_MESSAGE: 'AuthMessage',
  SEARCH_QUERY: 'SearchQuery',
  SEARCH_RESULT: 'SearchResult',
  CONNECTION_INITIALIZATION_RESPONSE: 'ConnectionInitializationResponse',
  HEARTBEAT: 'Heartbeat',
});

export const identitySearchMessageValidator: TUnion<IdentitySearchMessage> =
  t.union([
    authMessageValidator,
    searchQueryValidator,
    searchResultValidator,
    connectionInitializationResponseValidator,
    heartbeatValidator,
  ]);

export type IdentitySearchMessage =
  | AuthMessage
  | SearchQuery
  | SearchResult
  | ConnectionInitializationResponse
  | Heartbeat;
