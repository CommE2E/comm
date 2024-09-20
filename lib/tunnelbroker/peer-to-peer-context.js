// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  type TunnelbrokerClientMessageToDevice,
  useTunnelbroker,
} from './tunnelbroker-context.js';
import { usePeerOlmSessionsCreatorContext } from '../components/peer-olm-session-creator-provider.react.js';
import { useSendPushNotifs } from '../push/send-hooks.react.js';
import { getAllPeerDevices } from '../selectors/user-selectors.js';
import {
  type AuthMetadata,
  IdentityClientContext,
  type IdentityClientContextType,
} from '../shared/identity-client-context.js';
import type { NotificationsCreationData } from '../types/notif-types.js';
import { type OutboundP2PMessage } from '../types/sqlite-types.js';
import { getConfig } from '../utils/config.js';
import type { DeviceSessionCreationRequest } from '../utils/crypto-utils.js';
import { getMessageForException } from '../utils/errors.js';
import { entries } from '../utils/objects.js';
import {
  ephemeralEncryptAndSendMessageToPeer,
  handleOutboundP2PMessage,
  type HandleOutboundP2PMessageResult,
} from '../utils/peer-to-peer-communication-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type PeerToPeerContextType = {
  +processOutboundMessages: (
    outboundMessageIDs: ?$ReadOnlyArray<string>,
    dmOpID: ?string,
    notificationsCreationData: ?NotificationsCreationData,
  ) => void,
  +getDMOpsSendingPromise: () => {
    +promise: Promise<ProcessOutboundP2PMessagesResult>,
    +dmOpID: string,
  },
  +broadcastEphemeralMessage: (
    contentPayload: string,
    recipients: $ReadOnlyArray<{ +userID: string, +deviceID: string }>,
    authMetadata: AuthMetadata,
  ) => Promise<void>,
};

const PeerToPeerContext: React.Context<?PeerToPeerContextType> =
  React.createContext<?PeerToPeerContextType>();

type Props = {
  +children: React.Node,
};

export type ProcessOutboundP2PMessagesResult =
  | { +result: 'success' }
  | {
      +result: 'failure',
      +failedMessageIDs: $ReadOnlyArray<string>,
    };

async function createMissingSession(
  userDevicesWithoutSession: { [userID: string]: Array<string> },
  peerOlmSessionsCreator: (
    userID: string,
    devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
  ) => Promise<void>,
): Promise<void> {
  const creatingSessionPromises = entries(userDevicesWithoutSession).map(
    async ([userID, devices]) => {
      try {
        await peerOlmSessionsCreator(
          userID,
          devices.map(deviceID => ({ deviceID })),
        );
      } catch (e) {
        // Session creation may fail for some devices,
        // but we should still pursue delivery for others.
        console.log(e);
      }
    },
  );
  await Promise.all(creatingSessionPromises);
}

function processOutboundP2PMessagesResult(
  messageIDs: ?$ReadOnlyArray<string>,
  sentMessagesMap: {
    [messageID: string]: boolean,
  },
): ProcessOutboundP2PMessagesResult {
  const sentMessagesSet = new Set(Object.keys(sentMessagesMap));
  const failedMessageIDs =
    messageIDs?.filter(id => !sentMessagesSet.has(id)) ?? [];
  if (failedMessageIDs.length > 0) {
    return {
      result: 'failure',
      failedMessageIDs,
    };
  }
  return {
    result: 'success',
  };
}

async function processOutboundP2PMessages(
  sendMessage: (
    message: TunnelbrokerClientMessageToDevice,
    messageID: ?string,
  ) => Promise<void>,
  identityContext: IdentityClientContextType,
  peerOlmSessionsCreator: (
    userID: string,
    devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
  ) => Promise<void>,
  messageIDs: ?$ReadOnlyArray<string>,
  allPeerDevices: Set<string>,
): Promise<ProcessOutboundP2PMessagesResult> {
  let authMetadata;
  try {
    authMetadata = await identityContext.getAuthMetadata();
  } catch (e) {
    return {
      result: 'failure',
      failedMessageIDs: messageIDs ?? [],
    };
  }
  if (
    !authMetadata.deviceID ||
    !authMetadata.userID ||
    !authMetadata.accessToken
  ) {
    return {
      result: 'failure',
      failedMessageIDs: messageIDs ?? [],
    };
  }

  const { olmAPI, sqliteAPI } = getConfig();
  await olmAPI.initializeCryptoAccount();

  const sentMessagesMap: { [messageID: string]: boolean } = {};

  // 1. Retrieve messages to send.
  let messages;
  if (messageIDs) {
    messages = await sqliteAPI.getOutboundP2PMessagesByID(messageIDs);
    if (messageIDs.length !== messages.length) {
      const dbMessageIDsSet = new Set<string>(
        messages.map(message => message.messageID),
      );
      for (const messageID of messageIDs) {
        if (!dbMessageIDsSet.has(messageID)) {
          sentMessagesMap[messageID] = true;
        }
      }
    }
  } else {
    const allMessages = await sqliteAPI.getAllOutboundP2PMessages();
    messages = allMessages.filter(message => message.supportsAutoRetry);
  }

  const messagesMap: { [messageID: string]: OutboundP2PMessage } = {};

  // 2. Optimistically attempt to send all messages, and all should succeed,
  // the only exceptions are messages for devices we don't have a session
  // with or some other issues like network connection.
  const messagesPromises: Array<Promise<HandleOutboundP2PMessageResult>> = [];
  for (const message: OutboundP2PMessage of messages) {
    messagesMap[message.messageID] = message;

    // If the message was addressed to a peer that no longer
    // exists we can remove it and return success.
    if (!allPeerDevices.has(message.deviceID)) {
      messagesPromises.push(
        (async () => {
          await sqliteAPI.removeOutboundP2PMessage(
            message.messageID,
            message.deviceID,
          );
          return {
            status: 'success',
            messageID: message.messageID,
          };
        })(),
      );
    } else {
      messagesPromises.push(
        handleOutboundP2PMessage(message, authMetadata, sendMessage),
      );
    }
  }
  const messagesResults: Array<HandleOutboundP2PMessageResult> =
    await Promise.all(messagesPromises);

  // 3. Analyze results to retrieve all devices that need session creation
  // and map by userID.
  const userDevicesWithoutSession: { [userID: string]: Array<string> } = {};
  const messagesToRetry: Array<OutboundP2PMessage> = [];
  for (const result of messagesResults) {
    if (result.status === 'success') {
      sentMessagesMap[result.messageID] = true;
    }
    if (result.status === 'missing_session') {
      messagesToRetry.push(messagesMap[result.messageID]);
      const { userID, deviceID } = messagesMap[result.messageID];
      if (userDevicesWithoutSession[userID]) {
        userDevicesWithoutSession[userID].push(deviceID);
      } else {
        userDevicesWithoutSession[userID] = [deviceID];
      }
    }
  }

  if (messagesToRetry.length === 0) {
    return processOutboundP2PMessagesResult(messageIDs, sentMessagesMap);
  }

  // 4. Create sessions with users who have at least one device
  // without a session.
  await createMissingSession(userDevicesWithoutSession, peerOlmSessionsCreator);

  // 5. Retry messages for which the session was missing.
  const retryPromises = messagesToRetry.map(message =>
    handleOutboundP2PMessage(message, authMetadata, sendMessage),
  );
  const retryResults: Array<HandleOutboundP2PMessageResult> =
    await Promise.all(retryPromises);
  for (const result of retryResults) {
    if (result.status === 'success') {
      sentMessagesMap[result.messageID] = true;
    }
  }

  return processOutboundP2PMessagesResult(messageIDs, sentMessagesMap);
}

const AUTOMATIC_RETRY_FREQUENCY = 30 * 1000;

function PeerToPeerProvider(props: Props): React.Node {
  const { children } = props;

  const { sendMessageToDevice } = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');

  const dmOpsSendingPromiseResolvers = React.useRef<
    Map<
      string,
      {
        +resolve: (result: ProcessOutboundP2PMessagesResult) => mixed,
        +reject: Error => mixed,
      },
    >,
  >(new Map());

  // This returns a promise that will be resolved with arrays of successfully
  // sent messages, so in case of failing all messages (e.g. no internet
  // connection) it will still resolve but with an empty array.
  const getDMOpsSendingPromise = React.useCallback(() => {
    const dmOpID = uuid.v4();
    const promise = new Promise<ProcessOutboundP2PMessagesResult>(
      (resolve, reject) => {
        dmOpsSendingPromiseResolvers.current.set(dmOpID, { resolve, reject });
      },
    );

    return { promise, dmOpID };
  }, []);

  const processingQueue = React.useRef<
    Array<{
      +outboundMessageIDs: ?$ReadOnlyArray<string>,
      +dmOpID: ?string,
      +notificationsCreationData: ?NotificationsCreationData,
      +allPeerDevices: Set<string>,
    }>,
  >([]);
  const promiseRunning = React.useRef<boolean>(false);

  const { createOlmSessionsWithUser: peerOlmSessionsCreator } =
    usePeerOlmSessionsCreatorContext();
  const sendPushNotifs = useSendPushNotifs();
  const allPeerDevices = useSelector(getAllPeerDevices);
  const allPeerDevicesSet = React.useMemo(
    () => new Set<string>(allPeerDevices),
    [allPeerDevices],
  );

  const processOutboundMessages = React.useCallback(
    (
      outboundMessageIDs: ?$ReadOnlyArray<string>,
      dmOpID: ?string,
      notificationsCreationData: ?NotificationsCreationData,
    ) => {
      processingQueue.current.push({
        outboundMessageIDs,
        dmOpID,
        notificationsCreationData,
        allPeerDevices: allPeerDevicesSet,
      });
      if (!promiseRunning.current) {
        promiseRunning.current = true;
        void (async () => {
          do {
            const queueFront = processingQueue.current.shift();
            try {
              const [result] = await Promise.all([
                processOutboundP2PMessages(
                  sendMessageToDevice,
                  identityContext,
                  peerOlmSessionsCreator,
                  queueFront?.outboundMessageIDs,
                  queueFront.allPeerDevices,
                ),
                sendPushNotifs(queueFront.notificationsCreationData),
              ]);
              if (queueFront.dmOpID) {
                dmOpsSendingPromiseResolvers.current
                  .get(queueFront.dmOpID)
                  ?.resolve?.(result);
              }
            } catch (e) {
              console.log(
                `Error processing outbound P2P messages: ${
                  getMessageForException(e) ?? 'unknown'
                }`,
              );
              if (queueFront.dmOpID) {
                dmOpsSendingPromiseResolvers.current
                  .get(queueFront.dmOpID)
                  ?.reject?.(e);
              }
            } finally {
              if (queueFront.dmOpID) {
                dmOpsSendingPromiseResolvers.current.delete(queueFront.dmOpID);
              }
            }
          } while (processingQueue.current.length > 0);
          promiseRunning.current = false;
        })();
      }
    },
    [
      allPeerDevicesSet,
      sendMessageToDevice,
      identityContext,
      peerOlmSessionsCreator,
      sendPushNotifs,
    ],
  );

  const broadcastEphemeralMessage = React.useCallback(
    async (
      contentPayload: string,
      recipients: $ReadOnlyArray<{ +userID: string, +deviceID: string }>,
      authMetadata: AuthMetadata,
    ) => {
      const { userID: thisUserID, deviceID: thisDeviceID } = authMetadata;
      if (!thisDeviceID || !thisUserID) {
        throw new Error('No auth metadata');
      }
      const { olmAPI } = getConfig();
      await olmAPI.initializeCryptoAccount();

      // 1. Optimistically attempt to send all messages, and all should
      // succeed, the only exceptions are messages for devices we don't
      // have a session with or some other issues like network connection.
      const recipientPromises = recipients.map(async recipient =>
        ephemeralEncryptAndSendMessageToPeer(
          contentPayload,
          recipient,
          authMetadata,
          sendMessageToDevice,
        ),
      );
      const messagesResults = await Promise.all(recipientPromises);

      // 2. Analyze results to retrieve all devices that need session creation
      // and map by userID.
      const userDevicesWithoutSession: { [userID: string]: Array<string> } = {};
      const recipientsToRetry: Array<{ +userID: string, +deviceID: string }> =
        [];
      for (const result of messagesResults) {
        if (result.status === 'missing_session') {
          recipientsToRetry.push(result.recipient);
          const { userID, deviceID } = result.recipient;
          if (userDevicesWithoutSession[userID]) {
            userDevicesWithoutSession[userID].push(deviceID);
          } else {
            userDevicesWithoutSession[userID] = [deviceID];
          }
        }
      }
      if (recipientsToRetry.length === 0) {
        return;
      }

      // 3.Create a session with users which has at
      // least one device without a session.
      await createMissingSession(
        userDevicesWithoutSession,
        peerOlmSessionsCreator,
      );

      // 4. Retry recipients for which session was missing.
      const retryPromises = recipientsToRetry.map(async recipient =>
        ephemeralEncryptAndSendMessageToPeer(
          contentPayload,
          recipient,
          authMetadata,
          sendMessageToDevice,
        ),
      );
      await Promise.all(retryPromises);
    },
    [peerOlmSessionsCreator, sendMessageToDevice],
  );

  React.useEffect(() => {
    const intervalID = setInterval(
      processOutboundMessages,
      AUTOMATIC_RETRY_FREQUENCY,
    );
    return () => clearInterval(intervalID);
  }, [processOutboundMessages]);

  const value: PeerToPeerContextType = React.useMemo(
    () => ({
      processOutboundMessages,
      getDMOpsSendingPromise,
      broadcastEphemeralMessage,
    }),
    [
      broadcastEphemeralMessage,
      processOutboundMessages,
      getDMOpsSendingPromise,
    ],
  );

  return (
    <PeerToPeerContext.Provider value={value}>
      {children}
    </PeerToPeerContext.Provider>
  );
}

function usePeerToPeerCommunication(): PeerToPeerContextType {
  const context = React.useContext(PeerToPeerContext);
  invariant(context, 'PeerToPeerContext not found');

  return context;
}

export { PeerToPeerProvider, usePeerToPeerCommunication };
