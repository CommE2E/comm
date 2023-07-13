// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

export type KeyserverInfo = {
  +cookie: ?string,
};

export type KeyserverStore = {
  +keyserverInfos: { +[key: string]: KeyserverInfo },
};

export const keyserverInfoValidator: TInterface<KeyserverInfo> =
  tShape<KeyserverInfo>({
    cookie: t.String,
  });

export const keyserverStoreValidator: TInterface<KeyserverStore> =
  tShape<KeyserverStore>({
    keyserverInfos: t.dict(t.String, keyserverInfoValidator),
  });
