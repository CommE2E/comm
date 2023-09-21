// @flow

export type IntegrityStore = {
  +threadHashes: { +[string]: number },
  +threadHashingComplete: boolean,
};
