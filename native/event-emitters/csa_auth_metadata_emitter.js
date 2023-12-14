// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

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
  +commServicesAuthMetadata: [
    {
      +accessToken: string,
      +userID: string,
      +deviceID: string,
    },
  ],
}> {
  return new NativeEventEmitter(CommServicesAuthMetadataEmitterModule);
}

export { getCommServicesAuthMetadataEmitter };
