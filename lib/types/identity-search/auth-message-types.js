// @flow

/*
 * This file defines types and validation for the auth message sent
 * from the client to the Identity Search WebSocket server.
 * The definitions in this file should remain in sync
 * with the structures defined in the corresponding
 * Rust file at `shared/identity_search_messages/src/messages/auth_messages.rs`.
 *
 * If you edit the definitions in one file,
 * please make sure to update the corresponding definitions in the other.
 *
 */

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString, tUserID } from '../../utils/validation-utils.js';

export type IdentitySearchAuthMessage = {
  +type: 'IdentitySearchAuthMessage',
  +userID: string,
  +deviceID: string,
  +accessToken: string,
};

export const identityAuthMessageValidator: TInterface<IdentitySearchAuthMessage> =
  tShape<IdentitySearchAuthMessage>({
    type: tString('IdentitySearchAuthMessage'),
    userID: tUserID,
    deviceID: t.String,
    accessToken: t.String,
  });
