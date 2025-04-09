//@flow

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

interface Spec extends TurboModule {
  installTurboModule: () => boolean;
}

export default TurboModuleRegistry.get<Spec>('CommCoreJSInitializerModule');
