// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

import { type MessageType } from 'lib/types/message-types-enum.js';

export interface Spec extends TurboModule {
  +validateMessageTypes: (
    messageTypes: $ReadOnlyArray<{
      +messageTypeKey: string,
      +messageType: MessageType,
    }>,
  ) => Promise<void>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommValidationModule',
): Spec);
