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
  type IdentitySearchAuthMessage,
  identityAuthMessageValidator,
} from './auth-message-types.js';
import {
  type IdentitySearchQuery,
  identitySearchQueryValidator,
} from './search-query-types.js';
import {
  type IdentitySearchResponse,
  identitySearchResponseValidator,
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
  SEARCH_RESPONSE: 'IdentitySearchResponse',
  HEARTBEAT: 'Heartbeat',
});

export const identitySearchMessageToClientValidator: TUnion<IdentitySearchMessageToClient> =
  t.union([
    connectionInitializationResponseValidator,
    identitySearchResponseValidator,
    heartbeatValidator,
  ]);

export type IdentitySearchMessageToClient =
  | ConnectionInitializationResponse
  | IdentitySearchResponse
  | Heartbeat;

export const identitySearchMessageToServerTypes = Object.freeze({
  IDENTITY_SEARCH_AUTH_MESSAGE: 'IdentitySearchAuthMessage',
  IDENTITY_SEARCH_QUERY: 'IdentitySearchQuery',
  IDENTITY_SEARCH_PREFIX: 'IdentitySearchPrefix',
  HEARTBEAT: 'Heartbeat',
});

export const identitySearchMessageToServerValidator: TUnion<IdentitySearchMessageToServer> =
  t.union([
    identityAuthMessageValidator,
    identitySearchQueryValidator,
    heartbeatValidator,
  ]);

export type IdentitySearchMessageToServer =
  | IdentitySearchAuthMessage
  | IdentitySearchQuery
  | Heartbeat;
