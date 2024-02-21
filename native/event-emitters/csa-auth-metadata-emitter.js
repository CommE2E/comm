// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

import { type UserAuthMetadata } from 'lib/types/identity-service-types.js';

type CommServicesAuthMetadataEmitterConstants = {
  +COMM_SERVICES_AUTH_METADATA: 'commServicesAuthMetadata',
};

type CommServicesAuthMetadataEmitterModuleType = {
  +addListener: (eventName: string) => void,
  +removeListeners: (count: number) => void,
  +getConstants: () => CommServicesAuthMetadataEmitterConstants,
  ...CommServicesAuthMetadataEmitterConstants,
};

const CommServicesAuthMetadataEmitterModule: CommServicesAuthMetadataEmitterModuleType =
  NativeModules.CommServicesAuthMetadataEmitter;

function getCommServicesAuthMetadataEmitter(): NativeEventEmitter<{
  +commServicesAuthMetadata: [UserAuthMetadata],
}> {
  return new NativeEventEmitter(CommServicesAuthMetadataEmitterModule);
}

export { getCommServicesAuthMetadataEmitter };
