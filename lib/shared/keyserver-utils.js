// @flow

import * as React from 'react';

import { useGenerateP2PMessageToOwnDevices } from './dm-ops/dm-op-utils.js';
import {
  useGetVersion,
  getVersionActionTypes,
} from '../actions/device-actions.js';
import {
  addKeyserverActionType,
  removeKeyserverActionType,
} from '../actions/keyserver-actions.js';
import { urlsToIDsSelector } from '../selectors/keyserver-selectors.js';
import type { VersionResponse } from '../types/device-types.js';
import { type KeyserverInfo } from '../types/keyserver-types.js';
import type { AddKeyserverP2PMessage } from '../types/tunnelbroker/syncing-peer-to-peer-message-types.js';
import { userActionsP2PMessageTypes } from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import type { RemoveKeyserverMessage } from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function useIsKeyserverURLValid(
  keyserverURL?: string,
): () => Promise<VersionResponse> {
  const urlsToIDs: { +[keyserverID: string]: ?string } =
    useSelector(urlsToIDsSelector);

  const keyserverID: ?string = keyserverURL
    ? urlsToIDs[keyserverURL]
    : undefined;

  const keyserverInfo = useSelector(state =>
    keyserverID ? state.keyserverStore.keyserverInfos[keyserverID] : undefined,
  );

  const serverCallParamOverride = React.useMemo(() => {
    if (!keyserverURL) {
      return undefined;
    }

    if (keyserverInfo && keyserverID) {
      return {
        keyserverInfos: {
          [(keyserverID: string)]: keyserverInfo,
        },
      };
    }

    return {
      keyserverInfos: {
        [(keyserverURL: string)]: {
          urlPrefix: keyserverURL,
        },
      },
    };
  }, [keyserverID, keyserverInfo, keyserverURL]);

  const getVersionCall = useGetVersion(serverCallParamOverride);

  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(async () => {
    if (!keyserverURL) {
      throw new Error('isKeyserverURLValid called with empty URL');
    }

    const getVersionPromise = getVersionCall();
    void dispatchActionPromise(getVersionActionTypes, getVersionPromise);

    const { versionResponses } = await getVersionPromise;
    return versionResponses[Object.keys(versionResponses)[0]];
  }, [dispatchActionPromise, getVersionCall, keyserverURL]);
}

function useRemoveKeyserver(): (keyserverAdminUserID: string) => Promise<void> {
  const dispatch = useDispatch();
  const generateMessagesToPeers = useGenerateP2PMessageToOwnDevices();

  return React.useCallback(
    async (keyserverAdminUserID: string) => {
      const removeKeyserverP2PMessage: RemoveKeyserverMessage = {
        type: userActionsP2PMessageTypes.REMOVE_KEYSERVER,
        keyserverAdminUserID,
      };
      const plaintext = JSON.stringify(removeKeyserverP2PMessage);
      const outboundP2PMessages = await generateMessagesToPeers(plaintext);

      dispatch({
        type: removeKeyserverActionType,
        payload: {
          keyserverAdminUserID,
          outboundP2PMessages,
        },
      });
    },
    [dispatch, generateMessagesToPeers],
  );
}

function useAddKeyserver(): (
  keyserverAdminUserID: string,
  newKeyserverInfo: KeyserverInfo,
) => Promise<void> {
  const dispatch = useDispatch();
  const generateMessagesToPeers = useGenerateP2PMessageToOwnDevices();

  return React.useCallback(
    async (keyserverAdminUserID: string, newKeyserverInfo: KeyserverInfo) => {
      const addKeyserverP2PMessage: AddKeyserverP2PMessage = {
        type: userActionsP2PMessageTypes.ADD_KEYSERVER,
        keyserverAdminUserID,
        urlPrefix: newKeyserverInfo.urlPrefix,
      };
      const plaintext = JSON.stringify(addKeyserverP2PMessage);
      const outboundP2PMessages = await generateMessagesToPeers(plaintext);

      dispatch({
        type: addKeyserverActionType,
        payload: {
          keyserverAdminUserID,
          newKeyserverInfo,
          outboundP2PMessages,
        },
      });
    },
    [dispatch, generateMessagesToPeers],
  );
}

export { useIsKeyserverURLValid, useRemoveKeyserver, useAddKeyserver };
