//@flow

import type { TurboModule } from 'react-native//Libraries/TurboModule/RCTExport.js';
import { TurboModuleRegistry } from 'react-native';

interface Spec extends TurboModule {
  initializeComm: () => boolean;
}

export default (TurboModuleRegistry.get<Spec>('CommInitializerModule'): ?Spec);
