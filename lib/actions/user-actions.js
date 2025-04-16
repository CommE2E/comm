// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useClearAllHolders } from './holder-actions.js';
import {
  useBroadcastDeviceListUpdates,
  useBroadcastAccountDeletion,
} from '../hooks/peer-list-hooks.js';
import { useCheckIfPrimaryDevice } from '../hooks/primary-device-hooks.js';
import type {
  CallSingleKeyserverEndpoint,
  CallSingleKeyserverEndpointOptions,
} from '../keyserver-conn/call-single-keyserver-endpoint.js';
import {
  extractKeyserverIDFromID,
  sortThreadIDsPerKeyserver,
  sortCalendarQueryPerKeyserver,
} from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { usePreRequestUserState } from '../selectors/account-selectors.js';
import {
  getForeignPeerDeviceIDs,
  getOwnPeerDevices,
  getKeyserverDeviceID,
} from '../selectors/user-selectors.js';
import {
  getOneTimeKeyValuesFromBlob,
  getPrekeyValueFromBlob,
} from '../shared/crypto-utils.js';
import { fetchLatestDeviceList } from '../shared/device-list-utils.js';
import type { OutboundDMOperationSpecification } from '../shared/dm-ops/dm-op-utils';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import threadWatcher from '../shared/thread-watcher.js';
import {
  permissionsAndAuthRelatedRequestTimeout,
  callIdentityServiceTimeout,
  logoutTimeout,
} from '../shared/timeouts.js';
import {
  PeerToPeerContext,
  usePeerToPeerCommunication,
} from '../tunnelbroker/peer-to-peer-context.js';
import type {
  LegacyLogInInfo,
  LegacyLogInResult,
  UpdateUserSettingsRequest,
  PolicyAcknowledgmentRequest,
  ClaimUsernameRequest,
  ClaimUsernameResponse,
  LogInRequest,
  KeyserverAuthResult,
  KeyserverAuthInfo,
  ClientKeyserverAuthRequest,
  ClientLogInResponse,
  KeyserverLogOutResult,
  LogOutResult,
} from '../types/account-types.js';
import type { SetPeerDeviceListsPayload } from '../types/aux-user-types.js';
import type {
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
} from '../types/avatar-types.js';
import type { DMChangeThreadSubscriptionOperation } from '../types/dm-ops';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types.js';
import type { IdentityAuthResult } from '../types/identity-service-types.js';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types';
import type { GetOlmSessionInitializationDataResponse } from '../types/olm-session-types.js';
import type {
  UserSearchResult,
  ExactUserSearchResult,
} from '../types/search-types.js';
import type { PreRequestUserState } from '../types/session-types.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../types/subscription-types.js';
import { thickThreadTypes } from '../types/thread-types-enum.js';
import type { RawThreadInfos } from '../types/thread-types.js';
import {
  userActionsP2PMessageTypes,
  type DeviceLogoutP2PMessage,
  type SecondaryDeviceLogoutP2PMessage,
} from '../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import type {
  CurrentUserInfo,
  UserInfo,
  LoggedOutUserInfo,
} from '../types/user-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { getConfig } from '../utils/config.js';
import { getMessageForException } from '../utils/errors.js';
import { promiseWithTimeout } from '../utils/promises.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import { useIsRestoreFlowEnabled } from '../utils/services-utils.js';

const loggedOutUserInfo: LoggedOutUserInfo = {
  anonymous: true,
};

export type KeyserverLogOutInput = {
  +preRequestUserState: PreRequestUserState,
  +keyserverIDs?: $ReadOnlyArray<string>,
};

const logOutActionTypes = Object.freeze({
  started: 'LOG_OUT_STARTED',
  success: 'LOG_OUT_SUCCESS',
  failed: 'LOG_OUT_FAILED',
});

const keyserverLogOut =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: KeyserverLogOutInput) => Promise<KeyserverLogOutResult>) =>
  async input => {
    const { preRequestUserState } = input;
    const keyserverIDs = input.keyserverIDs ?? allKeyserverIDs;
    const requests: { [string]: {} } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {};
    }

    let response = null;
    try {
      response = await promiseWithTimeout(
        callKeyserverEndpoint('log_out', requests),
        logoutTimeout,
        'keyserver log_out',
      );
    } catch (e) {
      console.log(
        `Failed keyserver logout: ${getMessageForException(e) ?? ''}`,
      );
    }
    const currentUserInfo = response ? loggedOutUserInfo : null;
    return { currentUserInfo, preRequestUserState, keyserverIDs };
  };

type LogOutType = 'legacy' | 'primary_device' | 'secondary_device';
type UseLogOutOptions = {
  +logOutType: LogOutType,
  +skipIdentityLogOut?: boolean,
  +handleUseNewFlowResponse?: () => void,
};

function useBaseLogOut(
  options: UseLogOutOptions,
): (keyserverIDs?: $ReadOnlyArray<string>) => Promise<LogOutResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;

  const preRequestUserState = usePreRequestUserState();
  const callKeyserverLogOut = useKeyserverCall(keyserverLogOut);
  const sendLogoutMessage = useSendLogoutMessageToPrimaryDevice(false);

  const removeAllHolders = useClearAllHolders();

  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  const ownPeerDevices = useSelector(getOwnPeerDevices);
  const ownedKeyserverDeviceID = React.useMemo(
    () => getKeyserverDeviceID(ownPeerDevices),
    [ownPeerDevices],
  );

  const { logOutType, skipIdentityLogOut, handleUseNewFlowResponse } = options;
  return React.useCallback(
    async (keyserverIDs?: $ReadOnlyArray<string>) => {
      const holdersPromise = (async () => {
        try {
          await removeAllHolders();
        } catch (e) {
          console.log(
            `Removing holders failed: ${getMessageForException(e) ?? ''}`,
          );
        }
      })();

      const identityPromise = (async () => {
        if (skipIdentityLogOut || !commServicesAccessToken) {
          return;
        }
        if (!identityClient) {
          throw new Error('Identity service client is not initialized');
        }
        let callIdentityClientLogOut;
        if (logOutType === 'primary_device') {
          const { logOutPrimaryDevice } = identityClient;
          if (!logOutPrimaryDevice) {
            throw new Error(
              'logOutPrimaryDevice not defined. ' +
                'Are you calling it on non-primary device?',
            );
          }
          callIdentityClientLogOut = async () => {
            await logOutPrimaryDevice(ownedKeyserverDeviceID);
          };
        } else if (logOutType === 'secondary_device') {
          callIdentityClientLogOut = identityClient.logOutSecondaryDevice;
        } else {
          callIdentityClientLogOut = async () => {
            try {
              await identityClient.logOut();
            } catch (e) {
              const errorMessage = getMessageForException(e);
              if (errorMessage !== 'use_new_flow') {
                throw e;
              }

              // When use_new_flow is returned on legacy V1 login,
              // we are sure that another device upgraded flows and has become
              // primary, so this is now a secondary device which still uses
              // old flow
              try {
                await sendLogoutMessage();
              } catch (err) {
                console.log('Failed to send logout message:', err);
              }
              handleUseNewFlowResponse?.();
            }
          };
        }
        try {
          await promiseWithTimeout(
            callIdentityClientLogOut(),
            logoutTimeout,
            logOutType + ' identity log_out',
          );
        } catch (e) {
          console.log(
            `Failed to call identity client logout: ${
              getMessageForException(e) ?? ''
            }`,
          );
        }
      })();

      const [{ keyserverIDs: _, ...result }] = await Promise.all([
        callKeyserverLogOut({
          preRequestUserState,
          keyserverIDs,
        }),
        holdersPromise,
        identityPromise,
      ]);
      return {
        ...result,
        preRequestUserState: {
          ...result.preRequestUserState,
          commServicesAccessToken,
        },
      };
    },
    [
      callKeyserverLogOut,
      commServicesAccessToken,
      identityClient,
      logOutType,
      ownedKeyserverDeviceID,
      preRequestUserState,
      removeAllHolders,
      skipIdentityLogOut,
      sendLogoutMessage,
      handleUseNewFlowResponse,
    ],
  );
}

const legacyLogOutOptions: UseLogOutOptions = Object.freeze({
  logOutType: 'legacy',
});
function useLogOut(): () => Promise<LogOutResult> {
  const callLegacyLogOut = useBaseLogOut(legacyLogOutOptions);
  const callPrimaryDeviceLogOut = usePrimaryDeviceLogOut();
  const callSecondaryDeviceLogOut = useSecondaryDeviceLogOut();

  const checkIfPrimaryDevice = useCheckIfPrimaryDevice();
  const usingRestoreFlow = useIsRestoreFlowEnabled();

  return React.useCallback(async () => {
    if (usingRestoreFlow) {
      const isPrimaryDevice = await checkIfPrimaryDevice();
      return isPrimaryDevice
        ? callPrimaryDeviceLogOut()
        : callSecondaryDeviceLogOut();
    } else {
      return callLegacyLogOut();
    }
  }, [
    callLegacyLogOut,
    callPrimaryDeviceLogOut,
    callSecondaryDeviceLogOut,
    checkIfPrimaryDevice,
    usingRestoreFlow,
  ]);
}

function useIdentityLogOut(
  logOutType: LogOutType,
): () => Promise<LogOutResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;

  const preRequestUserState = usePreRequestUserState();
  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  return React.useCallback(async () => {
    if (!identityClient) {
      throw new Error('Identity service client is not initialized');
    }

    let callIdentityClientLogOut;
    if (logOutType === 'primary_device') {
      if (!identityClient.logOutPrimaryDevice) {
        throw new Error(
          'logOutPrimaryDevice not defined. ' +
            'Are you calling it on non-primary device?',
        );
      }
      callIdentityClientLogOut = identityClient.logOutPrimaryDevice;
    } else if (logOutType === 'secondary_device') {
      callIdentityClientLogOut = identityClient.logOutSecondaryDevice;
    } else {
      callIdentityClientLogOut = identityClient.logOut;
    }
    try {
      await promiseWithTimeout(
        callIdentityClientLogOut(),
        logoutTimeout,
        `identity ${logOutType} log_out`,
      );
    } catch (e) {
      console.log(`Identity logout failed: ${getMessageForException(e) ?? ''}`);
    }
    return {
      currentUserInfo: null,
      preRequestUserState: {
        ...preRequestUserState,
        commServicesAccessToken,
      },
    };
  }, [
    commServicesAccessToken,
    identityClient,
    logOutType,
    preRequestUserState,
  ]);
}

function useInvalidCSATLogOut(): () => Promise<void> {
  const dispatchActionPromise = useDispatchActionPromise();

  const preRequestUserState = usePreRequestUserState();
  const callKeyserverLogOut = useKeyserverCall(keyserverLogOut);

  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  return React.useCallback(() => {
    const keyserverLogOutPromise = async () => {
      // errors are swallowed inside `keyserverLogOut` above
      const { keyserverIDs: _, ...result } = await callKeyserverLogOut({
        preRequestUserState,
      });
      return {
        ...result,
        preRequestUserState: {
          ...result.preRequestUserState,
          commServicesAccessToken,
        },
      };
    };
    return dispatchActionPromise(logOutActionTypes, keyserverLogOutPromise());
  }, [
    dispatchActionPromise,
    commServicesAccessToken,
    callKeyserverLogOut,
    preRequestUserState,
  ]);
}

const primaryDeviceLogOutOptions = Object.freeze({
  logOutType: 'primary_device',
});

function usePrimaryDeviceLogOut(): () => Promise<LogOutResult> {
  const identityContext = React.useContext(IdentityClientContext);
  if (!identityContext) {
    throw new Error('Identity service client is not initialized');
  }

  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const { broadcastEphemeralMessage } = usePeerToPeerCommunication();
  const foreignPeerDevices = useSelector(getForeignPeerDeviceIDs);

  const ownPeerDevices = useSelector(getOwnPeerDevices);
  const ownedKeyserverDeviceID = React.useMemo(
    () => getKeyserverDeviceID(ownPeerDevices),
    [ownPeerDevices],
  );

  const logOut = useBaseLogOut(primaryDeviceLogOutOptions);
  return React.useCallback(async () => {
    const authMetadata = await identityContext.getAuthMetadata();
    const { userID, deviceID: thisDeviceID } = authMetadata;
    if (!thisDeviceID || !userID) {
      throw new Error('No auth metadata');
    }
    const [primaryDeviceID, ...secondaryDevices] = ownPeerDevices.map(
      it => it.deviceID,
    );
    if (thisDeviceID !== primaryDeviceID) {
      throw new Error('Used primary device logout on a non-primary device');
    }

    const messageContents: DeviceLogoutP2PMessage = {
      type: userActionsP2PMessageTypes.LOG_OUT_DEVICE,
    };
    const recipients = secondaryDevices
      .filter(deviceID => deviceID !== ownedKeyserverDeviceID)
      .map(deviceID => ({ userID, deviceID }));
    await broadcastEphemeralMessage(
      JSON.stringify(messageContents),
      recipients,
      authMetadata,
    );

    // - logOut() performs device list update by calling Identity RPC
    // - broadcastDeviceListUpdates asks peers to download it from identity
    // so we need to call them in this order to make sure peers have latest
    // device list.
    // We're relying on Tunnelbroker session stil existing after calling logout
    // and auth metadata not yet cleared at this point.
    const logOutResult = await logOut();
    await broadcastDeviceListUpdates(foreignPeerDevices);
    return logOutResult;
  }, [
    broadcastDeviceListUpdates,
    broadcastEphemeralMessage,
    foreignPeerDevices,
    identityContext,
    logOut,
    ownPeerDevices,
    ownedKeyserverDeviceID,
  ]);
}

function useSendLogoutMessageToPrimaryDevice(
  mandatory?: boolean = true,
): () => Promise<void> {
  const identityContext = React.useContext(IdentityClientContext);
  if (!identityContext) {
    throw new Error('Identity service client is not initialized');
  }
  const peerToPeerContext = React.useContext(PeerToPeerContext);

  return React.useCallback(async () => {
    if (!peerToPeerContext) {
      if (mandatory) {
        throw new Error('PeerToPeerContext not set');
      }
      return;
    }

    const { broadcastEphemeralMessage } = peerToPeerContext;
    const { identityClient, getAuthMetadata } = identityContext;
    const authMetadata = await getAuthMetadata();
    const { userID, deviceID } = authMetadata;
    if (!deviceID || !userID) {
      throw new Error('No auth metadata');
    }

    // get current device list and primary device ID
    const { devices } = await fetchLatestDeviceList(identityClient, userID);
    const primaryDeviceID = devices[0];
    if (deviceID === primaryDeviceID) {
      throw new Error('Used secondary device logout on primary device');
    }

    // create and send Olm Tunnelbroker message to primary device
    const { olmAPI } = getConfig();
    await olmAPI.initializeCryptoAccount();
    const messageContents: SecondaryDeviceLogoutP2PMessage = {
      type: userActionsP2PMessageTypes.LOG_OUT_SECONDARY_DEVICE,
    };
    const recipient = { userID, deviceID: primaryDeviceID };
    await broadcastEphemeralMessage(
      JSON.stringify(messageContents),
      [recipient],
      authMetadata,
    );
  }, [identityContext, peerToPeerContext, mandatory]);
}

const secondaryDeviceLogOutOptions = Object.freeze({
  logOutType: 'secondary_device',
});

function useSecondaryDeviceLogOut(): () => Promise<LogOutResult> {
  const logOut = useBaseLogOut(secondaryDeviceLogOutOptions);
  const sendLogoutMessage = useSendLogoutMessageToPrimaryDevice();

  return React.useCallback(async () => {
    try {
      await promiseWithTimeout(
        sendLogoutMessage(),
        logoutTimeout,
        'send logout message',
      );
    } catch (e) {
      console.log(
        `Failed to send logout message: ${getMessageForException(e) ?? ''}`,
      );
    }

    // log out of identity service, keyserver and visually
    return logOut();
  }, [sendLogoutMessage, logOut]);
}

const claimUsernameActionTypes = Object.freeze({
  started: 'CLAIM_USERNAME_STARTED',
  success: 'CLAIM_USERNAME_SUCCESS',
  failed: 'CLAIM_USERNAME_FAILED',
});
const claimUsername =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    claimUsernameRequest: ClaimUsernameRequest,
  ) => Promise<ClaimUsernameResponse>) =>
  async (claimUsernameRequest: ClaimUsernameRequest) => {
    const requests = { [authoritativeKeyserverID()]: claimUsernameRequest };
    const responses = await callKeyserverEndpoint('claim_username', requests);
    const response = responses[authoritativeKeyserverID()];
    return {
      message: response.message,
      signature: response.signature,
    };
  };

function useClaimUsername(): (
  claimUsernameRequest: ClaimUsernameRequest,
) => Promise<ClaimUsernameResponse> {
  return useKeyserverCall(claimUsername);
}

const deleteKeyserverAccountActionTypes = Object.freeze({
  started: 'DELETE_KEYSERVER_ACCOUNT_STARTED',
  success: 'DELETE_KEYSERVER_ACCOUNT_SUCCESS',
  failed: 'DELETE_KEYSERVER_ACCOUNT_FAILED',
});
const deleteKeyserverAccount =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: KeyserverLogOutInput) => Promise<KeyserverLogOutResult>) =>
  async input => {
    const { preRequestUserState } = input;
    const keyserverIDs = input.keyserverIDs ?? allKeyserverIDs;
    const requests: { [string]: {} } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {};
    }

    await callKeyserverEndpoint('delete_account', requests);
    return {
      currentUserInfo: loggedOutUserInfo,
      preRequestUserState,
      keyserverIDs,
    };
  };

const deleteAccountActionTypes = Object.freeze({
  started: 'DELETE_ACCOUNT_STARTED',
  success: 'DELETE_ACCOUNT_SUCCESS',
  failed: 'DELETE_ACCOUNT_FAILED',
});

const accountDeletionBroadcastOptions = Object.freeze({
  includeOwnDevices: true,
});
function useDeleteAccount(): (password: ?string) => Promise<LogOutResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;

  const broadcastAccountDeletion = useBroadcastAccountDeletion(
    accountDeletionBroadcastOptions,
  );

  const preRequestUserState = usePreRequestUserState();
  const callKeyserverDeleteAccount = useKeyserverCall(deleteKeyserverAccount);

  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  return React.useCallback(
    async password => {
      if (!identityClient) {
        throw new Error('Identity service client is not initialized');
      }
      const { deleteWalletUser, deletePasswordUser } = identityClient;
      if (!deleteWalletUser || !deletePasswordUser) {
        throw new Error('Delete user method unimplemented');
      }
      await broadcastAccountDeletion();
      if (password) {
        await deletePasswordUser(password);
      } else {
        await deleteWalletUser();
      }
      try {
        const keyserverResult = await callKeyserverDeleteAccount({
          preRequestUserState,
        });
        const { keyserverIDs: _, ...result } = keyserverResult;
        return {
          ...result,
          preRequestUserState: {
            ...result.preRequestUserState,
            commServicesAccessToken,
          },
        };
      } catch (e) {
        console.log(
          'Failed to delete account on keyserver:',
          getMessageForException(e),
        );
      }
      return {
        currentUserInfo: null,
        preRequestUserState: {
          ...preRequestUserState,
          commServicesAccessToken,
        },
      };
    },
    [
      broadcastAccountDeletion,
      callKeyserverDeleteAccount,
      commServicesAccessToken,
      identityClient,
      preRequestUserState,
    ],
  );
}

// useDeleteDiscardedIdentityAccount is used in a scenario where the user is
// visibly logged-out, and it's only used to reset state (eg. Redux, SQLite) to
// a logged-out state.
function useDeleteDiscardedIdentityAccount(): (
  password: ?string,
) => Promise<LogOutResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;

  const preRequestUserState = usePreRequestUserState();
  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  return React.useCallback(
    async password => {
      if (!identityClient) {
        throw new Error('Identity service client is not initialized');
      }
      if (
        !identityClient.deleteWalletUser ||
        !identityClient.deletePasswordUser
      ) {
        throw new Error('Delete user method unimplemented');
      }
      const deleteUserPromise = password
        ? identityClient.deletePasswordUser(password)
        : identityClient.deleteWalletUser();

      await promiseWithTimeout(
        deleteUserPromise,
        callIdentityServiceTimeout,
        'identity delete user call',
      );

      return {
        currentUserInfo: null,
        preRequestUserState: {
          ...preRequestUserState,
          commServicesAccessToken,
        },
      };
    },
    [commServicesAccessToken, identityClient, preRequestUserState],
  );
}

export type KeyserverAuthInput = $ReadOnly<{
  ...KeyserverAuthInfo,
  +preRequestUserInfo: ?CurrentUserInfo,
}>;

const keyserverAuthActionTypes = Object.freeze({
  started: 'KEYSERVER_AUTH_STARTED',
  success: 'KEYSERVER_AUTH_SUCCESS',
  failed: 'KEYSERVER_AUTH_FAILED',
});
const keyserverAuthCallSingleKeyserverEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const keyserverAuth =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: KeyserverAuthInput) => Promise<KeyserverAuthResult>) =>
  async keyserverAuthInfo => {
    const watchedIDs = threadWatcher.getWatchedIDs();

    const {
      authActionSource,
      calendarQuery,
      keyserverData,
      deviceTokenUpdateInput,
      preRequestUserInfo,
      ...restLogInInfo
    } = keyserverAuthInfo;

    const keyserverIDs = Object.keys(keyserverData);

    const watchedIDsPerKeyserver = sortThreadIDsPerKeyserver(watchedIDs);
    const calendarQueryPerKeyserver = sortCalendarQueryPerKeyserver(
      calendarQuery,
      keyserverIDs,
    );

    const requests: { [string]: ClientKeyserverAuthRequest } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {
        ...restLogInInfo,
        deviceTokenUpdateRequest: deviceTokenUpdateInput[keyserverID],
        watchedIDs: watchedIDsPerKeyserver[keyserverID] ?? [],
        calendarQuery: calendarQueryPerKeyserver[keyserverID],
        platformDetails: getConfig().platformDetails,
        initialContentEncryptedMessage:
          keyserverData[keyserverID].initialContentEncryptedMessage,
        initialNotificationsEncryptedMessage:
          keyserverData[keyserverID].initialNotificationsEncryptedMessage,
        source: authActionSource,
      };
    }

    const responses: { +[string]: ClientLogInResponse } =
      await callKeyserverEndpoint(
        'keyserver_auth',
        requests,
        keyserverAuthCallSingleKeyserverEndpointOptions,
      );

    let threadInfos: RawThreadInfos = {};
    const calendarResult: WritableCalendarResult = {
      calendarQuery: keyserverAuthInfo.calendarQuery,
      rawEntryInfos: [],
    };
    const messagesResult: WritableGenericMessagesResult = {
      messageInfos: [],
      truncationStatus: {},
      watchedIDsAtRequestTime: watchedIDs,
      currentAsOf: {},
    };
    let updatesCurrentAsOf: { +[string]: number } = {};
    for (const keyserverID in responses) {
      threadInfos = {
        ...responses[keyserverID].cookieChange.threadInfos,
        ...threadInfos,
      };
      if (responses[keyserverID].rawEntryInfos) {
        calendarResult.rawEntryInfos = calendarResult.rawEntryInfos.concat(
          responses[keyserverID].rawEntryInfos,
        );
      }
      messagesResult.messageInfos = messagesResult.messageInfos.concat(
        responses[keyserverID].rawMessageInfos,
      );
      messagesResult.truncationStatus = {
        ...messagesResult.truncationStatus,
        ...responses[keyserverID].truncationStatuses,
      };
      messagesResult.currentAsOf = {
        ...messagesResult.currentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
      updatesCurrentAsOf = {
        ...updatesCurrentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
    }

    const authKeyserverID = authoritativeKeyserverID();
    let userInfos: $ReadOnlyArray<UserInfo> = [];
    if (responses[authKeyserverID]) {
      const userInfosArrays = [
        responses[authKeyserverID].userInfos,
        responses[authKeyserverID].cookieChange.userInfos,
      ];

      userInfos = mergeUserInfos(...userInfosArrays);
    }

    return {
      threadInfos,
      currentUserInfo: responses[authKeyserverID]?.currentUserInfo,
      calendarResult,
      messagesResult,
      userInfos,
      updatesCurrentAsOf,
      authActionSource: keyserverAuthInfo.authActionSource,
      notAcknowledgedPolicies:
        responses[authKeyserverID]?.notAcknowledgedPolicies,
      preRequestUserInfo,
    };
  };

const identityRegisterActionTypes = Object.freeze({
  started: 'IDENTITY_REGISTER_STARTED',
  success: 'IDENTITY_REGISTER_SUCCESS',
  failed: 'IDENTITY_REGISTER_FAILED',
});
function useIdentityPasswordRegister(): (
  username: string,
  password: string,
  fid: ?string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  if (!identityClient.registerPasswordUser) {
    throw new Error('Register password user method unimplemented');
  }
  const { registerPasswordUser } = identityClient;
  const { markPrekeysAsPublished } = getConfig().olmAPI;

  return React.useCallback(
    async (username: string, password: string, fid: ?string) => {
      const response = await registerPasswordUser(username, password, fid);
      try {
        await markPrekeysAsPublished();
      } catch (e) {
        console.log(
          'Failed to mark prekeys as published:',
          getMessageForException(e),
        );
      }
      return response;
    },
    [registerPasswordUser, markPrekeysAsPublished],
  );
}
function useIdentityWalletRegister(): (
  walletAddress: string,
  siweMessage: string,
  siweSignature: string,
  fid: ?string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  if (!identityClient.registerWalletUser) {
    throw new Error('Register wallet user method unimplemented');
  }
  const { registerWalletUser } = identityClient;
  const { markPrekeysAsPublished } = getConfig().olmAPI;

  return React.useCallback(
    async (
      walletAddress: string,
      siweMessage: string,
      siweSignature: string,
      fid: ?string,
    ) => {
      const response = await registerWalletUser(
        walletAddress,
        siweMessage,
        siweSignature,
        fid,
      );
      try {
        await markPrekeysAsPublished();
      } catch (e) {
        console.log(
          'Failed to mark prekeys as published:',
          getMessageForException(e),
        );
      }
      return response;
    },
    [registerWalletUser, markPrekeysAsPublished],
  );
}

const identityGenerateNonceActionTypes = Object.freeze({
  started: 'IDENTITY_GENERATE_NONCE_STARTED',
  success: 'IDENTITY_GENERATE_NONCE_SUCCESS',
  failed: 'IDENTITY_GENERATE_NONCE_FAILED',
});
function useIdentityGenerateNonce(): () => Promise<string> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  return identityClient.generateNonce;
}

function mergeUserInfos(
  ...userInfoArrays: Array<$ReadOnlyArray<UserInfo>>
): UserInfo[] {
  const merged: { [string]: UserInfo } = {};
  for (const userInfoArray of userInfoArrays) {
    for (const userInfo of userInfoArray) {
      merged[userInfo.id] = userInfo;
    }
  }
  const flattened = [];
  for (const id in merged) {
    flattened.push(merged[id]);
  }
  return flattened;
}

type WritableGenericMessagesResult = {
  messageInfos: RawMessageInfo[],
  truncationStatus: MessageTruncationStatuses,
  watchedIDsAtRequestTime: string[],
  currentAsOf: { [keyserverID: string]: number },
};
type WritableCalendarResult = {
  rawEntryInfos: RawEntryInfo[],
  calendarQuery: CalendarQuery,
};

const identityLogInActionTypes = Object.freeze({
  started: 'IDENTITY_LOG_IN_STARTED',
  success: 'IDENTITY_LOG_IN_SUCCESS',
  failed: 'IDENTITY_LOG_IN_FAILED',
});
function useIdentityPasswordLogIn(): (
  username: string,
  password: string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  const preRequestUserState = useSelector(state => state.currentUserInfo);
  const callClaimUsername = useClaimUsername();
  const { markPrekeysAsPublished } = getConfig().olmAPI;

  return React.useCallback(
    (username, password) => {
      if (!identityClient) {
        throw new Error('Identity service client is not initialized');
      }
      return (async () => {
        let result;
        try {
          result = await identityClient.logInPasswordUser(username, password);
        } catch (e) {
          const { registerReservedPasswordUser } = identityClient;
          if (
            !registerReservedPasswordUser ||
            getMessageForException(e) !==
              'need_keyserver_message_to_claim_username'
          ) {
            throw e;
          }
          let message, signature;
          try {
            const callClaimUsernameResult = await callClaimUsername({
              username,
              password,
            });
            ({ message, signature } = callClaimUsernameResult);
          } catch (claimException) {
            if (
              getMessageForException(claimException) === 'invalid_credentials'
            ) {
              // This error means the password was incorrect
              throw new Error('login_failed');
            } else {
              throw claimException;
            }
          }
          result = await registerReservedPasswordUser(
            username,
            password,
            message,
            signature,
          );
        }
        try {
          await markPrekeysAsPublished();
        } catch (e) {
          console.log(
            'Failed to mark prekeys as published:',
            getMessageForException(e),
          );
        }
        return {
          ...result,
          preRequestUserState,
        };
      })();
    },
    [
      identityClient,
      markPrekeysAsPublished,
      preRequestUserState,
      callClaimUsername,
    ],
  );
}
function useIdentityWalletLogIn(): (
  walletAddress: string,
  siweMessage: string,
  siweSignature: string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  const { logInWalletUser } = identityClient;
  const { markPrekeysAsPublished } = getConfig().olmAPI;

  return React.useCallback(
    async (
      walletAddress: string,
      siweMessage: string,
      siweSignature: string,
    ) => {
      const response = await logInWalletUser(
        walletAddress,
        siweMessage,
        siweSignature,
      );
      try {
        await markPrekeysAsPublished();
      } catch (e) {
        console.log(
          'Failed to mark prekeys as published:',
          getMessageForException(e),
        );
      }
      return response;
    },
    [logInWalletUser, markPrekeysAsPublished],
  );
}
function useIdentitySecondaryDeviceLogIn(): (
  userID: string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  const { generateNonce, uploadKeysForRegisteredDeviceAndLogIn } =
    identityClient;

  const { signMessage, markPrekeysAsPublished } = getConfig().olmAPI;

  return React.useCallback(
    async (userID: string) => {
      const nonce = await generateNonce();
      const nonceSignature = await signMessage(nonce);
      const response = await uploadKeysForRegisteredDeviceAndLogIn(userID, {
        nonce,
        nonceSignature,
      });
      try {
        await markPrekeysAsPublished();
      } catch (e) {
        console.log(
          'Failed to mark prekeys as published:',
          getMessageForException(e),
        );
      }
      return response;
    },
    [
      generateNonce,
      markPrekeysAsPublished,
      signMessage,
      uploadKeysForRegisteredDeviceAndLogIn,
    ],
  );
}

const legacyLogInActionTypes = Object.freeze({
  started: 'LEGACY_LOG_IN_STARTED',
  success: 'LEGACY_LOG_IN_SUCCESS',
  failed: 'LEGACY_LOG_IN_FAILED',
});
const legacyLogInCallSingleKeyserverEndpointOptions = {
  timeout: permissionsAndAuthRelatedRequestTimeout,
};
const legacyLogIn =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: LegacyLogInInfo) => Promise<LegacyLogInResult>) =>
  async logInInfo => {
    const watchedIDs = threadWatcher.getWatchedIDs();
    const {
      authActionSource,
      calendarQuery,
      keyserverIDs: inputKeyserverIDs,
      preRequestUserInfo,
      ...restLogInInfo
    } = logInInfo;

    // Eventually the list of keyservers will be fetched from the
    // identity service
    const keyserverIDs = inputKeyserverIDs ?? [authoritativeKeyserverID()];

    const watchedIDsPerKeyserver = sortThreadIDsPerKeyserver(watchedIDs);
    const calendarQueryPerKeyserver = sortCalendarQueryPerKeyserver(
      calendarQuery,
      keyserverIDs,
    );

    const requests: { [string]: LogInRequest } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {
        ...restLogInInfo,
        deviceTokenUpdateRequest:
          logInInfo.deviceTokenUpdateRequest[keyserverID],
        source: authActionSource,
        watchedIDs: watchedIDsPerKeyserver[keyserverID] ?? [],
        calendarQuery: calendarQueryPerKeyserver[keyserverID],
        platformDetails: getConfig().platformDetails,
      };
    }

    const responses: { +[string]: ClientLogInResponse } =
      await callKeyserverEndpoint(
        'log_in',
        requests,
        legacyLogInCallSingleKeyserverEndpointOptions,
      );

    const userInfosArrays = [];

    let threadInfos: RawThreadInfos = {};
    const calendarResult: WritableCalendarResult = {
      calendarQuery: logInInfo.calendarQuery,
      rawEntryInfos: [],
    };
    const messagesResult: WritableGenericMessagesResult = {
      messageInfos: [],
      truncationStatus: {},
      watchedIDsAtRequestTime: watchedIDs,
      currentAsOf: {},
    };
    let updatesCurrentAsOf: { +[string]: number } = {};
    for (const keyserverID in responses) {
      threadInfos = {
        ...responses[keyserverID].cookieChange.threadInfos,
        ...threadInfos,
      };
      if (responses[keyserverID].rawEntryInfos) {
        calendarResult.rawEntryInfos = calendarResult.rawEntryInfos.concat(
          responses[keyserverID].rawEntryInfos,
        );
      }
      messagesResult.messageInfos = messagesResult.messageInfos.concat(
        responses[keyserverID].rawMessageInfos,
      );
      messagesResult.truncationStatus = {
        ...messagesResult.truncationStatus,
        ...responses[keyserverID].truncationStatuses,
      };
      messagesResult.currentAsOf = {
        ...messagesResult.currentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
      updatesCurrentAsOf = {
        ...updatesCurrentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
      userInfosArrays.push(responses[keyserverID].userInfos);
      userInfosArrays.push(responses[keyserverID].cookieChange.userInfos);
    }

    const userInfos = mergeUserInfos(...userInfosArrays);

    return {
      threadInfos,
      currentUserInfo: responses[authoritativeKeyserverID()].currentUserInfo,
      calendarResult,
      messagesResult,
      userInfos,
      updatesCurrentAsOf,
      authActionSource: logInInfo.authActionSource,
      notAcknowledgedPolicies:
        responses[authoritativeKeyserverID()].notAcknowledgedPolicies,
      preRequestUserInfo,
    };
  };

const changeIdentityUserPasswordActionTypes = Object.freeze({
  started: 'CHANGE_IDENTITY_USER_PASSWORD_STARTED',
  success: 'CHANGE_IDENTITY_USER_PASSWORD_SUCCESS',
  failed: 'CHANGE_IDENTITY_USER_PASSWORD_FAILED',
});

function useChangeIdentityUserPassword(): (
  oldPassword: string,
  newPassword: string,
) => Promise<void> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  return React.useCallback(
    (oldPassword, newPassword) => {
      if (!identityClient) {
        throw new Error('Identity service client is not initialized');
      }
      return identityClient.changePassword(oldPassword, newPassword);
    },
    [identityClient],
  );
}

const searchUsersActionTypes = Object.freeze({
  started: 'SEARCH_USERS_STARTED',
  success: 'SEARCH_USERS_SUCCESS',
  failed: 'SEARCH_USERS_FAILED',
});
const searchUsers =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((usernamePrefix: string) => Promise<UserSearchResult>) =>
  async usernamePrefix => {
    const response = await callSingleKeyserverEndpoint('search_users', {
      prefix: usernamePrefix,
    });
    return {
      userInfos: response.userInfos,
    };
  };

const exactSearchUserActionTypes = Object.freeze({
  started: 'EXACT_SEARCH_USER_STARTED',
  success: 'EXACT_SEARCH_USER_SUCCESS',
  failed: 'EXACT_SEARCH_USER_FAILED',
});
const exactSearchUser =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((username: string) => Promise<ExactUserSearchResult>) =>
  async username => {
    const response = await callSingleKeyserverEndpoint('exact_search_user', {
      username,
    });
    return {
      userInfo: response.userInfo,
    };
  };

const updateSubscriptionActionTypes = Object.freeze({
  started: 'UPDATE_SUBSCRIPTION_STARTED',
  success: 'UPDATE_SUBSCRIPTION_SUCCESS',
  failed: 'UPDATE_SUBSCRIPTION_FAILED',
});
const updateSubscription =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: SubscriptionUpdateRequest,
  ) => Promise<SubscriptionUpdateResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'update_user_subscription',
      requests,
    );
    const response = responses[keyserverID];
    return {
      threadID: input.threadID,
      subscription: response.threadSubscription,
    };
  };

type UseUpdateSubscriptionInput = $ReadOnly<
  | {
      +thick: false,
      ...SubscriptionUpdateRequest,
    }
  | {
      +thick: true,
      +threadInfo: ThreadInfo,
      ...SubscriptionUpdateRequest,
    },
>;
function useUpdateSubscription(): (
  input: UseUpdateSubscriptionInput,
) => Promise<SubscriptionUpdateResult> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const keyserverCall = useKeyserverCall(updateSubscription);

  return React.useCallback(
    async (input: UseUpdateSubscriptionInput) => {
      if (!input.thick) {
        const { thick, ...rest } = input;
        return await keyserverCall({ ...rest });
      }

      invariant(viewerID, 'viewerID must be set');

      const { threadInfo, updatedFields } = input;
      const subscription = {
        ...threadInfo.currentUser.subscription,
        ...updatedFields,
      };

      const op: DMChangeThreadSubscriptionOperation = {
        type: 'change_thread_subscription',
        time: Date.now(),
        threadID: threadInfo.id,
        creatorID: viewerID,
        subscription,
      };

      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
      };

      await processAndSendDMOperation(opSpecification);
      return { threadID: threadInfo.id, subscription };
    },
    [keyserverCall, processAndSendDMOperation, viewerID],
  );
}

const setUserSettingsActionTypes = Object.freeze({
  started: 'SET_USER_SETTINGS_STARTED',
  success: 'SET_USER_SETTINGS_SUCCESS',
  failed: 'SET_USER_SETTINGS_FAILED',
});

const setUserSettings =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: UpdateUserSettingsRequest) => Promise<void>) =>
  async input => {
    const requests: { [string]: UpdateUserSettingsRequest } = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = input;
    }
    await callKeyserverEndpoint('update_user_settings', requests);
  };

function useSetUserSettings(): (
  input: UpdateUserSettingsRequest,
) => Promise<void> {
  return useKeyserverCall(setUserSettings);
}

const getOlmSessionInitializationDataActionTypes = Object.freeze({
  started: 'GET_OLM_SESSION_INITIALIZATION_DATA_STARTED',
  success: 'GET_OLM_SESSION_INITIALIZATION_DATA_SUCCESS',
  failed: 'GET_OLM_SESSION_INITIALIZATION_DATA_FAILED',
});

const getOlmSessionInitializationData =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((
    options?: ?CallSingleKeyserverEndpointOptions,
  ) => Promise<GetOlmSessionInitializationDataResponse>) =>
  async options => {
    const olmInitData = await callSingleKeyserverEndpoint(
      'get_olm_session_initialization_data',
      {},
      options,
    );
    return {
      signedIdentityKeysBlob: olmInitData.signedIdentityKeysBlob,
      contentInitializationInfo: {
        ...olmInitData.contentInitializationInfo,
        oneTimeKey: getOneTimeKeyValuesFromBlob(
          olmInitData.contentInitializationInfo.oneTimeKey,
        )[0],
        prekey: getPrekeyValueFromBlob(
          olmInitData.contentInitializationInfo.prekey,
        ),
      },
      notifInitializationInfo: {
        ...olmInitData.notifInitializationInfo,
        oneTimeKey: getOneTimeKeyValuesFromBlob(
          olmInitData.notifInitializationInfo.oneTimeKey,
        )[0],
        prekey: getPrekeyValueFromBlob(
          olmInitData.notifInitializationInfo.prekey,
        ),
      },
    };
  };

const policyAcknowledgmentActionTypes = Object.freeze({
  started: 'POLICY_ACKNOWLEDGMENT_STARTED',
  success: 'POLICY_ACKNOWLEDGMENT_SUCCESS',
  failed: 'POLICY_ACKNOWLEDGMENT_FAILED',
});
const policyAcknowledgment =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((policyRequest: PolicyAcknowledgmentRequest) => Promise<void>) =>
  async policyRequest => {
    await callSingleKeyserverEndpoint('policy_acknowledgment', policyRequest);
  };

const updateUserAvatarActionTypes = Object.freeze({
  started: 'UPDATE_USER_AVATAR_STARTED',
  success: 'UPDATE_USER_AVATAR_SUCCESS',
  failed: 'UPDATE_USER_AVATAR_FAILED',
});
const updateUserAvatar =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((
    avatarDBContent: UpdateUserAvatarRequest,
  ) => Promise<UpdateUserAvatarResponse>) =>
  async avatarDBContent => {
    const { updates }: UpdateUserAvatarResponse =
      await callSingleKeyserverEndpoint('update_user_avatar', avatarDBContent);
    return { updates };
  };

const processNewUserIDsActionType = 'PROCESS_NEW_USER_IDS';

const versionSupportedByIdentityActionTypes = Object.freeze({
  started: 'VERSION_SUPPORTED_BY_IDENTITY_STARTED',
  success: 'VERSION_SUPPORTED_BY_IDENTITY_SUCCESS',
  failed: 'VERSION_SUPPORTED_BY_IDENTITY_FAILED',
});

function useVersionSupportedByIdentity(): () => Promise<{
  +supported: boolean,
}> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  return async () => {
    const supported = await identityClient.versionSupported();
    return { supported };
  };
}

const restoreUserActionTypes = Object.freeze({
  started: 'RESTORE_USER_STARTED',
  success: 'RESTORE_USER_SUCCESS',
  failed: 'RESTORE_USER_FAILED',
});

export type RestoreUserResult = $ReadOnly<{
  ...IdentityAuthResult,
  ...SetPeerDeviceListsPayload,
}>;

export {
  changeIdentityUserPasswordActionTypes,
  useChangeIdentityUserPassword,
  claimUsernameActionTypes,
  useClaimUsername,
  deleteKeyserverAccountActionTypes,
  getOlmSessionInitializationDataActionTypes,
  getOlmSessionInitializationData,
  mergeUserInfos,
  legacyLogIn as legacyLogInRawAction,
  identityLogInActionTypes,
  useIdentityPasswordLogIn,
  useIdentityWalletLogIn,
  useIdentitySecondaryDeviceLogIn,
  legacyLogInActionTypes,
  useBaseLogOut,
  useLogOut,
  useIdentityLogOut,
  usePrimaryDeviceLogOut,
  useSecondaryDeviceLogOut,
  logOutActionTypes,
  searchUsers,
  searchUsersActionTypes,
  exactSearchUser,
  exactSearchUserActionTypes,
  useSetUserSettings,
  setUserSettingsActionTypes,
  useUpdateSubscription,
  updateSubscriptionActionTypes,
  policyAcknowledgment,
  policyAcknowledgmentActionTypes,
  updateUserAvatarActionTypes,
  updateUserAvatar,
  deleteAccountActionTypes,
  useDeleteAccount,
  useDeleteDiscardedIdentityAccount,
  keyserverAuthActionTypes,
  keyserverAuth as keyserverAuthRawAction,
  identityRegisterActionTypes,
  useIdentityPasswordRegister,
  useIdentityWalletRegister,
  identityGenerateNonceActionTypes,
  useIdentityGenerateNonce,
  processNewUserIDsActionType,
  versionSupportedByIdentityActionTypes,
  useVersionSupportedByIdentity,
  useInvalidCSATLogOut,
  restoreUserActionTypes,
};
