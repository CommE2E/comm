// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

type Draft = {|
  +threadID: string,
  +text: string,
|};

export interface Spec extends TurboModule {
  +getDraft: (threadID: string) => string;
  +updateDraft: (draft: Draft) => boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CommTurboModule');
