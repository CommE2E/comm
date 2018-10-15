// @flow

import type { PlatformDetails } from '../types/device-types';

class ExtendableError extends Error {

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }

}

class ServerError extends ExtendableError {

  payload: ?Object;
  // Used for client_version_unsupported on server-side only
  platformDetails: ?PlatformDetails;

  constructor(error: string, payload?: Object) {
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

export {
  ServerError,
  FetchTimeout,
};
