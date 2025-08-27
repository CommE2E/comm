// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

type APIMethod =
  | {
      +type: 'GET',
    }
  | { +type: 'PUT' }
  | { +type: 'POST' }
  | { +type: 'STREAM' };

export type FarcasterAPIRequest = {
  +type: 'FarcasterAPIRequest',
  +requestID: string,
  +userID: string,
  +apiVersion: string,
  +endpoint: string,
  +method: APIMethod,
  +payload: string,
};

type FarcasterAPIResponseError = {
  +type: 'FarcasterAPIResponseError',
  +status: number,
  +message: string,
};
export const farcasterAPIResponseErrorValidator: TInterface<FarcasterAPIResponseError> =
  tShape<FarcasterAPIResponseError>({
    type: tString('FarcasterAPIResponseError'),
    status: t.Number,
    message: t.String,
  });

type FarcasterAPIResponseDataSuccess = { +type: 'Success', +data: string };
type FarcasterAPIResponseDataErrorResponse = {
  +type: 'ErrorResponse',
  +data: FarcasterAPIResponseError,
};
type FarcasterAPIResponseDataError = { +type: 'Error', +data: string };
type FarcasterAPIResponseDataInvalidRequest = { +type: 'InvalidRequest' };
type FarcasterAPIResponseDataUnauthenticated = { +type: 'Unauthenticated' };
type FarcasterAPIResponseDataSerializationError = {
  +type: 'SerializationError',
  +data: string,
};
type FarcasterAPIResponseDataMissingFarcasterDCsToken = {
  +type: 'MissingFarcasterDCsToken',
};

export type FarcasterAPIResponseData =
  | FarcasterAPIResponseDataSuccess
  | FarcasterAPIResponseDataErrorResponse
  | FarcasterAPIResponseDataError
  | FarcasterAPIResponseDataInvalidRequest
  | FarcasterAPIResponseDataUnauthenticated
  | FarcasterAPIResponseDataSerializationError
  | FarcasterAPIResponseDataMissingFarcasterDCsToken;

const farcasterAPIResponseDataValidator = t.union([
  tShape<FarcasterAPIResponseDataSuccess>({
    type: tString('Success'),
    data: t.String,
  }),
  tShape<FarcasterAPIResponseDataErrorResponse>({
    type: tString('ErrorResponse'),
    data: farcasterAPIResponseErrorValidator,
  }),
  tShape<FarcasterAPIResponseDataError>({
    type: tString('Error'),
    data: t.String,
  }),
  tShape<FarcasterAPIResponseDataInvalidRequest>({
    type: tString('InvalidRequest'),
  }),
  tShape<FarcasterAPIResponseDataUnauthenticated>({
    type: tString('Unauthenticated'),
  }),
  tShape<FarcasterAPIResponseDataSerializationError>({
    type: tString('SerializationError'),
    data: t.String,
  }),
  tShape<FarcasterAPIResponseDataMissingFarcasterDCsToken>({
    type: tString('MissingFarcasterDCsToken'),
  }),
]);

export type FarcasterAPIResponse = {
  +type: 'FarcasterAPIResponse',
  +requestID: string,
  +response: FarcasterAPIResponseData,
};

export const farcasterAPIResponseValidator: TInterface<FarcasterAPIResponse> =
  tShape<FarcasterAPIResponse>({
    type: tString('FarcasterAPIResponse'),
    requestID: t.String,
    response: farcasterAPIResponseDataValidator,
  });
