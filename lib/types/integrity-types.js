// @flow

export type IntegrityStore = {
  +threadHashes: ThreadHashes,
  +threadHashingStatus: ThreadHashingStatus,
};

export type ThreadHashes = { +[string]: number };

export type ThreadHashingStatus =
  | 'data_not_loaded'
  | 'starting'
  | 'running'
  | 'completed';
