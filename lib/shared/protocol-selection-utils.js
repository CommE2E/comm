// @flow

import { protocolNames, type ProtocolName } from '../types/protocol-names.js';
import type { SelectedUserInfo } from '../types/user-types.js';

function getSelectedUsersSupportState(
  selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>,
  currentUserSupportsFarcasterDCs: boolean,
): {
  +allUsersSupportThickThreads: boolean,
  +allUsersSupportFarcasterThreads: boolean,
  +canUseFarcasterThreads: boolean,
} {
  const allUsersSupportThickThreads =
    selectedUserInfos.length > 0 &&
    selectedUserInfos.every(userInfo =>
      userInfo.supportedProtocols.includes(protocolNames.COMM_DM),
    );
  const allUsersSupportFarcasterThreads =
    selectedUserInfos.length > 0 &&
    selectedUserInfos.every(userInfo =>
      userInfo.supportedProtocols.includes(protocolNames.FARCASTER_DC),
    );
  const canUseFarcasterThreads =
    currentUserSupportsFarcasterDCs &&
    (selectedUserInfos.length === 0 || allUsersSupportFarcasterThreads);
  return {
    allUsersSupportThickThreads,
    allUsersSupportFarcasterThreads,
    canUseFarcasterThreads,
  };
}

function getSupportedProtocolsForUser({
  supportsThickThreads,
  supportsFarcasterDCs,
}: {
  +supportsThickThreads?: ?boolean,
  +supportsFarcasterDCs?: ?boolean,
}): $ReadOnlyArray<ProtocolName> {
  const supportedProtocols: Array<ProtocolName> = [protocolNames.KEYSERVER];
  if (supportsThickThreads) {
    supportedProtocols.push(protocolNames.COMM_DM);
  }
  if (supportsFarcasterDCs) {
    supportedProtocols.push(protocolNames.FARCASTER_DC);
  }
  return supportedProtocols;
}

function getSupportedProtocolsForSearching(
  selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>,
  currentUserSupportsFarcasterDCs: boolean,
): $ReadOnlyArray<ProtocolName> {
  const { allUsersSupportThickThreads, canUseFarcasterThreads } =
    getSelectedUsersSupportState(
      selectedUserInfos,
      currentUserSupportsFarcasterDCs,
    );
  return getSupportedProtocolsForUser({
    supportsThickThreads:
      selectedUserInfos.length === 0 || allUsersSupportThickThreads,
    supportsFarcasterDCs: canUseFarcasterThreads,
  });
}

function getAvailableProtocolsForSearching(
  selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>,
  currentUserSupportsFarcasterDCs: boolean,
): $ReadOnlyArray<ProtocolName> {
  const availableProtocols = getSupportedProtocolsForSearching(
    selectedUserInfos,
    currentUserSupportsFarcasterDCs,
  );
  // We don't allow selecting the KEYSERVER protocol because it's deprecated
  return availableProtocols.filter(
    protocol => protocol !== protocolNames.KEYSERVER,
  );
}

function getSearchingProtocol(
  selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>,
  currentUserSupportsFarcasterDCs: boolean,
  selectedProtocol: ?ProtocolName,
): ProtocolName {
  if (selectedUserInfos.length === 0) {
    return protocolNames.COMM_DM;
  }
  const availableProtocols = getAvailableProtocolsForSearching(
    selectedUserInfos,
    currentUserSupportsFarcasterDCs,
  );
  if (selectedProtocol && availableProtocols.includes(selectedProtocol)) {
    return selectedProtocol;
  }
  if (availableProtocols.includes(protocolNames.COMM_DM)) {
    return protocolNames.COMM_DM;
  }
  if (availableProtocols.includes(protocolNames.FARCASTER_DC)) {
    return protocolNames.FARCASTER_DC;
  }
  return protocolNames.KEYSERVER;
}

function getSelectedProtocolForCompose(
  selectedUserInfos: $ReadOnlyArray<SelectedUserInfo>,
  currentUserSupportsFarcasterDCs: boolean,
  selectedProtocol: ?ProtocolName,
): ?ProtocolName {
  if (selectedUserInfos.length === 0) {
    return undefined;
  }
  const supportedProtocols = getSupportedProtocolsForSearching(
    selectedUserInfos,
    currentUserSupportsFarcasterDCs,
  );
  if (selectedProtocol && supportedProtocols.includes(selectedProtocol)) {
    return undefined;
  }
  if (supportedProtocols.length === 1) {
    return supportedProtocols[0];
  }
  return null;
}

export {
  getSupportedProtocolsForUser,
  getAvailableProtocolsForSearching,
  getSearchingProtocol,
  getSelectedProtocolForCompose,
};
