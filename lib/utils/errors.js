// @flow

import copyError from 'utils-copy-error';

import type { PlatformDetails } from '../types/device-types';

class ExtendableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

class ServerError extends ExtendableError {
  // When specified on server side, will get passed down to client
  // Only used in updateEntry and deleteEntry currently
  payload: ?Object;
  // Used for client_version_unsupported on server-side only
  platformDetails: ?PlatformDetails;
  // Used for input validators on server-side only
  sanitizedInput: mixed;

  constructor(error: string, payload?: ?Object) {
    super(error);
    this.payload = payload;
  }
}

class FetchTimeout extends ExtendableError {
  url: string;

  constructor(error: string, url: string) {
    super(error);
    this.url = url;
  }
}

function getMessageForException(e: mixed): ?string {
  if (typeof e === 'string') {
    return e;
  } else if (
    e &&
    typeof e === 'object' &&
    e.message &&
    typeof e.message === 'string'
  ) {
    return e.message;
  }
  return undefined;
}

function cloneError<E>(e: E): E {
  return copyError(e);
}

export {
  ExtendableError,
  ServerError,
  FetchTimeout,
  getMessageForException,
  cloneError,
};
