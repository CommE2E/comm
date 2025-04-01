// @flow

import { auxUserStoreOpsHandlers } from 'lib/ops/aux-user-store-ops.js';
import { communityStoreOpsHandlers } from 'lib/ops/community-store-ops.js';
import { entryStoreOpsHandlers } from 'lib/ops/entries-store-ops.js';
import { integrityStoreOpsHandlers } from 'lib/ops/integrity-store-ops.js';
import { keyserverStoreOpsHandlers } from 'lib/ops/keyserver-store-ops.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import { syncedMetadataStoreOpsHandlers } from 'lib/ops/synced-metadata-store-ops.js';
import { threadActivityStoreOpsHandlers } from 'lib/ops/thread-activity-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import { userStoreOpsHandlers } from 'lib/ops/user-store-ops.js';
import type { ClientStore } from 'lib/types/store-ops-types.js';
import { translateClientDBLocalMessageInfos } from 'lib/utils/message-ops-utils.js';

import { defaultWebState } from '../redux/default-state.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

async function getClientDBStore(currentUserID: ?string): Promise<ClientStore> {
  const sharedWorker = await getCommSharedWorker();
  let result: ClientStore = {
    currentUserID,
    drafts: [],
    messages: null,
    threadStore: null,
    messageStoreThreads: null,
    reports: null,
    users: null,
    keyserverInfos: defaultWebState.keyserverStore.keyserverInfos,
    communityInfos: null,
    threadHashes: null,
    syncedMetadata: null,
    auxUserInfos: null,
    threadActivityStore: null,
    entries: null,
    messageStoreLocalMessageInfos: null,
  };
  const data = await sharedWorker.schedule({
    type: workerRequestMessageTypes.GET_CLIENT_STORE,
  });
  if (data?.store?.drafts) {
    result = {
      ...result,
      drafts: data.store.drafts,
    };
  }
  if (data?.store?.reports) {
    result = {
      ...result,
      reports: reportStoreOpsHandlers.translateClientDBData(data.store.reports),
    };
  }
  if (data?.store?.threads && data.store.threads.length > 0) {
    result = {
      ...result,
      threadStore: {
        threadInfos: threadStoreOpsHandlers.translateClientDBData(
          data.store.threads,
        ),
      },
    };
  }
  if (data?.store?.keyservers?.length) {
    result = {
      ...result,
      keyserverInfos: keyserverStoreOpsHandlers.translateClientDBData(
        data.store.keyservers,
      ),
    };
  }
  if (data?.store?.communities) {
    result = {
      ...result,
      communityInfos: communityStoreOpsHandlers.translateClientDBData(
        data.store.communities,
      ),
    };
  }
  if (data?.store?.integrityThreadHashes) {
    result = {
      ...result,
      threadHashes: integrityStoreOpsHandlers.translateClientDBData(
        data.store.integrityThreadHashes,
      ),
    };
  }
  if (data?.store?.syncedMetadata) {
    result = {
      ...result,
      syncedMetadata: syncedMetadataStoreOpsHandlers.translateClientDBData(
        data.store.syncedMetadata,
      ),
    };
  }
  if (data?.store?.auxUserInfos) {
    result = {
      ...result,
      auxUserInfos: auxUserStoreOpsHandlers.translateClientDBData(
        data.store.auxUserInfos,
      ),
    };
  }
  if (data?.store?.users && data.store.users.length > 0) {
    result = {
      ...result,
      users: userStoreOpsHandlers.translateClientDBData(data.store.users),
    };
  }
  if (data?.store?.messages && data.store.messages.length > 0) {
    result = {
      ...result,
      messages: data.store.messages,
    };
  }
  if (
    data?.store?.messageStoreThreads &&
    data.store.messageStoreThreads.length > 0
  ) {
    result = {
      ...result,
      messageStoreThreads: data.store.messageStoreThreads,
    };
  }
  if (
    data?.store?.threadActivityEntries &&
    data.store.threadActivityEntries.length > 0
  ) {
    result = {
      ...result,
      threadActivityStore: threadActivityStoreOpsHandlers.translateClientDBData(
        data.store.threadActivityEntries,
      ),
    };
  }

  if (data?.store?.entries && data.store.entries.length > 0) {
    result = {
      ...result,
      entries: entryStoreOpsHandlers.translateClientDBData(data.store.entries),
    };
  }

  if (
    data?.store?.messageStoreLocalMessageInfos &&
    data.store.messageStoreLocalMessageInfos.length > 0
  ) {
    result = {
      ...result,
      messageStoreLocalMessageInfos: translateClientDBLocalMessageInfos(
        data.store.messageStoreLocalMessageInfos,
      ),
    };
  }
  return result;
}

export { getClientDBStore };
