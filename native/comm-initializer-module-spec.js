//@flow

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

interface Spec extends TurboModule {
  initializeComm: () => boolean;
}

export default (TurboModuleRegistry.get<Spec>('CommInitializerModule'): ?Spec);
