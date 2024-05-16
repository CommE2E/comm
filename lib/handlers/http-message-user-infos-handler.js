// @flow

import t, { type TType } from 'tcomb';

import type { CallSingleKeyserverEndpointResponse } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import { mixedRawThreadInfoValidator } from '../permissions/minimally-encoded-raw-thread-info-validators.js';
import type { Endpoint } from '../types/endpoints.js';
import { userInfoValidator } from '../types/user-types.js';
import { endpointValidators } from '../types/validators/endpoint-validators.js';
import { extractUserIDsFromPayload } from '../utils/conversion-utils.js';
import { tID, tShape } from '../utils/validation-utils.js';

function extendResponderValidator(inputValidator: TType<*>): TType<*> {
  return tShape({
    ...inputValidator.meta.props,
    cookieChange: t.maybe(
      tShape({
        threadInfos: t.dict(tID, mixedRawThreadInfoValidator),
        userInfos: t.list(userInfoValidator),
        cookieInvalidated: t.Boolean,
        sessionID: t.maybe(t.String),
        cookie: t.maybe(t.String),
      }),
    ),
    error: t.maybe(t.String),
    payload: t.maybe(t.Object),
    success: t.maybe(t.Boolean),
  });
}

function httpMessageUserInfosHandler(
  message: CallSingleKeyserverEndpointResponse,
  endpoint: Endpoint,
): void {
  const extendedValidator = extendResponderValidator(
    endpointValidators[endpoint].validator,
  );
  // eslint-disable-next-line no-unused-vars
  const newUserIDs = extractUserIDsFromPayload(extendedValidator, message);
  // TODO: dispatch an action adding the new user ids to the UserStore
}

export { httpMessageUserInfosHandler };
