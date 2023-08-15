// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

// Once we start using the cookie field on web,
// the cookie field type should be changed to string | null.
// See https://linear.app/comm/issue/ENG-4347/stop-using-browser-cookies
export type KeyserverInfo = {
  +cookie?: ?string,
  +sessionID?: ?string,
  +updatesCurrentAsOf: number, // millisecond timestamp
  +urlPrefix: string,
};

export type KeyserverStore = {
  +keyserverInfos: { +[key: string]: KeyserverInfo },
};

export const keyserverInfoValidator: TInterface<KeyserverInfo> =
  tShape<KeyserverInfo>({
    cookie: t.maybe(t.String),
    sessionID: t.maybe(t.String),
    updatesCurrentAsOf: t.Number,
    urlPrefix: t.String,
  });

export const keyserverStoreValidator: TInterface<KeyserverStore> =
  tShape<KeyserverStore>({
    keyserverInfos: t.dict(t.String, keyserverInfoValidator),
  });
