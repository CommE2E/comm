// @flow

class ExtendableError extends Error {

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }

}

class ServerError extends ExtendableError {

  payload: ?Object;

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
