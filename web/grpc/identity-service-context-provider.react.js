// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';

import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import {
  IdentityClientContext,
  type AuthMetadata,
} from 'lib/shared/identity-client-context.js';
import type {
  IdentityServiceClient,
  IdentityServiceAuthLayer,
} from 'lib/types/identity-service-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { useSelector } from '../redux/redux-utils.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { getOpaqueWasmPath } from '../shared-worker/utils/constants.js';
import {
  workerRequestMessageTypes,
  workerResponseMessageTypes,
} from '../types/worker-types.js';

type CreateMethodWorkerProxy = <Return>(
  method: $Keys<IdentityServiceClient>,
) => (...args: $ReadOnlyArray<mixed>) => Promise<Return>;

type Props = {
  +children: React.Node,
};
function IdentityServiceContextProvider(props: Props): React.Node {
  const { children } = props;

  const userID = useSelector(state => state.currentUserInfo?.id);
  const accessToken = useSelector(state => state.commServicesAccessToken);

  const getAuthMetadata = React.useCallback<
    () => Promise<AuthMetadata>,
  >(async () => {
    const contentSigningKey = await getContentSigningKey();
    return {
      userID,
      deviceID: contentSigningKey,
      accessToken,
    };
  }, [accessToken, userID]);

  const workerClientAuthMetadata = React.useRef<?AuthMetadata>(null);
  const ensureThatWorkerClientAuthMetadataIsCurrent =
    React.useCallback(async () => {
      const [sharedWorker, authMetadata] = await Promise.all([
        getCommSharedWorker(),
        getAuthMetadata(),
      ]);

      if (_isEqual(authMetadata, workerClientAuthMetadata.current)) {
        return;
      }

      workerClientAuthMetadata.current = authMetadata;

      let authLayer: ?IdentityServiceAuthLayer = null;
      if (
        authMetadata.userID &&
        authMetadata.deviceID &&
        authMetadata.accessToken
      ) {
        authLayer = {
          userID: authMetadata.userID,
          deviceID: authMetadata.deviceID,
          commServicesAccessToken: authMetadata.accessToken,
        };
      }

      await sharedWorker.schedule({
        type: workerRequestMessageTypes.CREATE_IDENTITY_SERVICE_CLIENT,
        opaqueWasmPath: getOpaqueWasmPath(),
        authLayer,
      });
    }, [getAuthMetadata]);

  React.useEffect(() => {
    void ensureThatWorkerClientAuthMetadataIsCurrent();
  }, [ensureThatWorkerClientAuthMetadataIsCurrent]);

  const invalidTokenLogOut = useInvalidCSATLogOut();
  const proxyMethodToWorker: CreateMethodWorkerProxy = React.useCallback(
    method =>
      async (...args: $ReadOnlyArray<mixed>) => {
        await ensureThatWorkerClientAuthMetadataIsCurrent();

        const sharedWorker = await getCommSharedWorker();
        let result;
        try {
          result = await sharedWorker.schedule({
            type: workerRequestMessageTypes.CALL_IDENTITY_CLIENT_METHOD,
            method,
            args,
          });
        } catch (e) {
          const message = getMessageForException(e);
          if (message === 'bad_credentials') {
            void invalidTokenLogOut();
          }
          throw e;
        }

        if (!result) {
          throw new Error(
            `Worker identity call didn't return expected message`,
          );
        } else if (
          result.type !== workerResponseMessageTypes.CALL_IDENTITY_CLIENT_METHOD
        ) {
          throw new Error(
            `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
              result,
            )}`,
          );
        }

        // Worker should return a message with the corresponding return type
        return (result.result: any);
      },
    [ensureThatWorkerClientAuthMetadataIsCurrent, invalidTokenLogOut],
  );

  const client = React.useMemo<IdentityServiceClient>(() => {
    return {
      logOut: proxyMethodToWorker('logOut'),
      logOutSecondaryDevice: proxyMethodToWorker('logOutSecondaryDevice'),
      getKeyserverKeys: proxyMethodToWorker('getKeyserverKeys'),
      getOutboundKeysForUser: proxyMethodToWorker('getOutboundKeysForUser'),
      getInboundKeysForUser: proxyMethodToWorker('getInboundKeysForUser'),
      uploadOneTimeKeys: proxyMethodToWorker('uploadOneTimeKeys'),
      logInPasswordUser: proxyMethodToWorker('logInPasswordUser'),
      logInWalletUser: proxyMethodToWorker('logInWalletUser'),
      uploadKeysForRegisteredDeviceAndLogIn: proxyMethodToWorker(
        'uploadKeysForRegisteredDeviceAndLogIn',
      ),
      generateNonce: proxyMethodToWorker('generateNonce'),
      publishWebPrekeys: proxyMethodToWorker('publishWebPrekeys'),
      getDeviceListHistoryForUser: proxyMethodToWorker(
        'getDeviceListHistoryForUser',
      ),
      getDeviceListsForUsers: proxyMethodToWorker('getDeviceListsForUsers'),
      syncPlatformDetails: proxyMethodToWorker('syncPlatformDetails'),
      getFarcasterUsers: proxyMethodToWorker('getFarcasterUsers'),
      linkFarcasterAccount: proxyMethodToWorker('linkFarcasterAccount'),
      unlinkFarcasterAccount: proxyMethodToWorker('unlinkFarcasterAccount'),
      findUserIdentities: proxyMethodToWorker('findUserIdentities'),
      versionSupported: proxyMethodToWorker('versionSupported'),
      changePassword: proxyMethodToWorker('changePassword'),
    };
  }, [proxyMethodToWorker]);

  const value = React.useMemo(
    () => ({
      identityClient: client,
      getAuthMetadata,
    }),
    [client, getAuthMetadata],
  );

  return (
    <IdentityClientContext.Provider value={value}>
      {children}
    </IdentityClientContext.Provider>
  );
}

export default IdentityServiceContextProvider;
