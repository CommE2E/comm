// @flow

import t, { type TInterface, type TType } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

// Once we start using the cookie field on web,
// the cookie field type should be changed to string | null.
// See https://linear.app/comm/issue/ENG-4347/stop-using-browser-cookies
export type BaseKeyserverInfo = {
  +cookie?: ?string,
  ...
};

export type WebKeyserverInfo = {
  ...$Exact<BaseKeyserverInfo>,
  +sessionID: ?string,
};

export type NativeKeyserverInfo = {
  ...$Exact<BaseKeyserverInfo>,
  +sessionID?: void,
};

export type KeyserverInfo = NativeKeyserverInfo | WebKeyserverInfo;

export type KeyserverStore<KeyserverInfoType: KeyserverInfo> = {
  +keyserverInfos: { +[key: string]: KeyserverInfoType },
};

export const webKeyserverInfoValidator: TInterface<WebKeyserverInfo> =
  tShape<WebKeyserverInfo>({
    cookie: t.maybe(t.String),
    sessionID: t.maybe(t.String),
  });

export const keyserverStoreValidator = <T: KeyserverInfo>(
  typ: TType<T>,
): TInterface<KeyserverStore<T>> =>
  tShape<KeyserverStore<T>>({
    keyserverInfos: t.dict(t.String, typ),
  });
