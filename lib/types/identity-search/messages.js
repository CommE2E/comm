// @flow

/*
 * This file defines types and validation for messages sent
 * to Identity Search WebSocket server and messages sent to client.
 * The definitions in this file should remain in sync
 * with the structures defined in the corresponding
 * Rust file at `shared/identity_search_messages/src/messages/mod.rs`.
 *
 * If you edit the definitions in one file,
 * please make sure to update the corresponding definitions in the other.
 *
 */

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
  type SearchResponse,
  searchResponseValidator,
} from './search-response-types.js';
import {
  type ConnectionInitializationResponse,
  connectionInitializationResponseValidator,
} from '../websocket/connection-initialization-response-types.js';
import {
  type Heartbeat,
  heartbeatValidator,
} from '../websocket/heartbeat-types.js';

export const identitySearchMessageToClientTypes = Object.freeze({
  CONNECTION_INITIALIZATION_RESPONSE: 'ConnectionInitializationResponse',
  SUCCESS: 'Success',
  ERROR: 'Error',
  SEARCH_RESPONSE: 'SearchResponse',
  HEARTBEAT: 'Heartbeat',
});

export const identitySearchMessageToClientValidator: TUnion<IdentitySearchMessageToClient> =
  t.union([
    connectionInitializationResponseValidator,
    searchResponseValidator,
    heartbeatValidator,
  ]);

export type IdentitySearchMessageToClient =
  | ConnectionInitializationResponse
  | SearchResponse
  | Heartbeat;

export const identitySearchMessageToServerTypes = Object.freeze({
  AUTH_MESSAGE: 'AuthMessage',
  SEARCH_QUERY: 'SearchQuery',
  PREFIX: 'Prefix',
  HEARTBEAT: 'Heartbeat',
});

export const identitySearchMessageToServerValidator: TUnion<IdentitySearchMessageToServer> =
  t.union([authMessageValidator, searchQueryValidator, heartbeatValidator]);

export type IdentitySearchMessageToServer =
  | AuthMessage
  | SearchQuery
  | Heartbeat;
