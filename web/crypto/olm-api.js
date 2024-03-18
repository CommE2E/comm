// @flow

import olm from '@commapp/olm';

import { type OlmAPI } from 'lib/types/crypto-types.js';

import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { getOlmWasmPath } from '../shared-worker/utils/constants.js';
import {
  workerRequestMessageTypes,
  workerResponseMessageTypes,
} from '../types/worker-types.js';

const usingSharedWorker = false;

function proxyToWorker<T>(
  method: $Keys<OlmAPI>,
): (...args: $ReadOnlyArray<mixed>) => Promise<T> {
  return async (...args: $ReadOnlyArray<mixed>) => {
    const sharedWorker = await getCommSharedWorker();
    const result = await sharedWorker.schedule({
      type: workerRequestMessageTypes.CALL_OLM_API_METHOD,
      method,
      args,
    });

    if (!result) {
      throw new Error(`Worker OlmAPI call didn't return expected message`);
    } else if (result.type !== workerResponseMessageTypes.CALL_OLM_API_METHOD) {
      throw new Error(
        `Worker OlmAPI call didn't return expected message. Instead got: ${JSON.stringify(
          result,
        )}`,
      );
    }

    // Worker should return a message with the corresponding return type
    return (result.result: any);
  };
}

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    if (usingSharedWorker) {
      const sharedWorker = await getCommSharedWorker();
      await sharedWorker.schedule({
        type: workerRequestMessageTypes.INITIALIZE_CRYPTO_ACCOUNT,
        olmWasmPath: getOlmWasmPath(),
      });
    } else {
      await olm.init();
    }
  },
  getUserPublicKey: proxyToWorker('getUserPublicKey'),
  encrypt: proxyToWorker('encrypt'),
  decrypt: proxyToWorker('decrypt'),
  contentInboundSessionCreator: proxyToWorker('contentInboundSessionCreator'),
  contentOutboundSessionCreator: proxyToWorker('contentOutboundSessionCreator'),
  notificationsSessionCreator: proxyToWorker('notificationsSessionCreator'),
  getOneTimeKeys: proxyToWorker('getOneTimeKeys'),
  validateAndUploadPrekeys: proxyToWorker('validateAndUploadPrekeys'),
};

export { olmAPI, usingSharedWorker };
