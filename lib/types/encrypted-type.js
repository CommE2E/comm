// @flow

export type EncryptResult = {
  +type: 0 | 1, // 0: PreKey, 1: Message
  +body: string,
};
