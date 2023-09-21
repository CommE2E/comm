// @flow

export type IntegrityStore = {
  +threadHashes: { +[string]: number },
  +threadHashingStatus:
    | 'data_not_loaded'
    | 'starting'
    | 'running'
    | 'completed',
};
