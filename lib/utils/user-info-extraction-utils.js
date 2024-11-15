// @flow

import _memoize from 'lodash/memoize.js';
import t, { type TType, type TInterface } from 'tcomb';

import { processNewUserIDsActionType } from '../actions/user-actions.js';
import type { CallSingleKeyserverEndpointResponse } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import { mixedThinRawThreadInfoValidator } from '../permissions/minimally-encoded-raw-thread-info-validators.js';
import type { Endpoint } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import type { MixedRawThreadInfos } from '../types/thread-types.js';
import { userInfoValidator } from '../types/user-types.js';
import type { UserInfo } from '../types/user-types.js';
import { endpointValidators } from '../types/validators/endpoint-validators.js';
import { extractUserIDsFromPayload } from '../utils/conversion-utils.js';
import { tID, tShape } from '../utils/validation-utils.js';

type AdditionalCookieChange = {
  +threadInfos: MixedRawThreadInfos,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +cookieInvalidated?: boolean,
  sessionID?: string,
  cookie?: string,
};

type AdditionalResponseFields = {
  +cookieChange: AdditionalCookieChange,
  +error?: string,
  +payload?: Object,
  +success: boolean,
};

const additionalResponseFieldsValidator = tShape<AdditionalResponseFields>({
  cookieChange: t.maybe(
    tShape<AdditionalCookieChange>({
      threadInfos: t.dict(tID, mixedThinRawThreadInfoValidator),
      userInfos: t.list(userInfoValidator),
      cookieInvalidated: t.maybe(t.Boolean),
      sessionID: t.maybe(t.String),
      cookie: t.maybe(t.String),
    }),
  ),
  error: t.maybe(t.String),
  payload: t.maybe(t.Object),
  success: t.maybe(t.Boolean),
});

function extendResponderValidatorBase<T>(inputValidator: TType<T>): TType<T> {
  if (inputValidator.meta.kind === 'union') {
    const newTypes = [];
    for (const innerValidator of inputValidator.meta.types) {
      const newInnerValidator = extendResponderValidatorBase(innerValidator);
      newTypes.push(newInnerValidator);
    }
    return t.union(newTypes);
  } else if (inputValidator.meta.kind === 'interface') {
    const recastValidator: TInterface<Object> = (inputValidator: any);

    return (tShape({
      ...recastValidator.meta.props,
      ...additionalResponseFieldsValidator.meta.props,
    }): any);
  } else if (inputValidator.meta.kind === 'maybe') {
    const typeObj = extendResponderValidatorBase(inputValidator.meta.type);
    return (t.maybe(typeObj): any);
  } else if (inputValidator.meta.kind === 'subtype') {
    return extendResponderValidatorBase(inputValidator.meta.type);
  }

  return inputValidator;
}

const extendResponderValidator = _memoize(extendResponderValidatorBase);

function extractAndPersistUserInfosFromEndpointResponse(
  message: CallSingleKeyserverEndpointResponse,
  endpoint: Endpoint,
  dispatch: Dispatch,
): void {
  const extendedValidator = extendResponderValidator(
    endpointValidators[endpoint].validator,
  );
  const newUserIDs = extractUserIDsFromPayload(extendedValidator, message);
  if (newUserIDs.length > 0) {
    dispatch({
      type: processNewUserIDsActionType,
      payload: { userIDs: newUserIDs },
    });
  }
}

export { extractAndPersistUserInfosFromEndpointResponse };
