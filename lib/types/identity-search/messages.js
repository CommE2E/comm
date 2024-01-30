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
  HEARTBEAT: 'Heartbeat',
  CONNECTION_INITIALIZATION_RESPONSE: 'ConnectionInitializationResponse',
  SEARCH_RESULT: 'SearchResult',
});

/*
 * This file defines types and validation for messages exchanged
 * with the Identity Search WebSocket server.
 * The definitions in this file should remain in sync
 * with the structures defined in the corresponding
 * Rust file at `shared/identity_search_messages/src/messages/mod.rs`.
 *
 * If you edit the definitions in one file,
 * please make sure to update the corresponding definitions in the other.
 *
 */

export const identitySearchMessageValidator: TUnion<IdentitySearchMessage> =
  t.union([
    authMessageValidator,
    searchQueryValidator,
    heartbeatValidator,
    connectionInitializationResponseValidator,
    searchResultValidator,
  ]);

export type IdentitySearchMessage =
  | AuthMessage
  | SearchQuery
  | Heartbeat
  | ConnectionInitializationResponse
  | SearchResult;
