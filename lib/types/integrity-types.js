// @flow

export type IntegrityStore = {
  +threadHashes: { +[string]: number },
  +threadHashingStatus: 'starting' | 'running' | 'completed',
};
