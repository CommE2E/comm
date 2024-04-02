// @flow

import { createTransform } from 'redux-persist';
import type { Transform } from 'redux-persist/es/types.js';

import type {
  LocalMessageInfo,
  MessageStore,
} from '../../types/message-types.js';

// On native, after migration 31, we'll no longer want to persist
// `messageStore.messages` and `messageStore.threads` via redux-persist.
// On web we want to start persisting `messageStore.messages` and
// `messageStore.threads in the database.

// However, we DO want to continue (or start on web) persisting everything in
// `messageStore` EXCEPT for `messages` and `threads`. The `blacklist` property
// in `persistConfig` allows us to specify top-level keys that shouldn't be
// persisted. However, we aren't able to specify nested keys in `blacklist`.
// As a result, if we want to prevent nested keys from being persisted we'll
// need to use `createTransform(...)` to specify an `inbound` function that
// allows us to modify the `state` object before it's passed through
// `JSON.stringify(...)` and written to disk. We specify the keys for which
// this transformation should be executed in the `whitelist` property of the
// `config` object that's passed to `createTransform(...)`.
type PersistedMessageStore = {
  +local: { +[id: string]: LocalMessageInfo },
  +currentAsOf: { +[keyserverID: string]: number },
};
const messageStoreMessagesBlocklistTransform: Transform = createTransform(
  (state: MessageStore): PersistedMessageStore => {
    const { messages, threads, ...messageStoreSansMessages } = state;
    return { ...messageStoreSansMessages };
  },
  (state: MessageStore): MessageStore => {
    // On web `state.threads` and `state.messages` should always be undefined.
    // On native the situation is more complicated:
    // We typically expect `messageStore.messages` to be `undefined` because
    // messages are persisted in the SQLite `messages` table rather than via
    // `redux-persist`. In this case we want to set `messageStore.messages`
    // to {} so we don't run into issues with `messageStore.messages` being
    // `undefined` (https://phab.comm.dev/D5545).
    //
    // However, in the case that a user is upgrading from a client where
    // `persistConfig.version` < 31, we expect `messageStore.messages` to
    // contain messages stored via `redux-persist` that we need in order
    // to correctly populate the SQLite `messages` table in migration 31
    // (https://phab.comm.dev/D2600).
    //
    // However, because `messageStoreMessagesBlocklistTransform` modifies
    // `messageStore` before migrations are run, we need to make sure we aren't
    // inadvertently clearing `messageStore.messages` (by setting to {}) before
    // messages are stored in SQLite (https://linear.app/comm/issue/ENG-2377).
    return {
      ...state,
      threads: state.threads ?? {},
      messages: state.messages ?? {},
    };
  },
  { whitelist: ['messageStore'] },
);

export { messageStoreMessagesBlocklistTransform };
