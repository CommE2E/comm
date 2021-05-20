// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

type Draft = {|
  +key: string,
  +text: string,
|};

export interface Spec extends TurboModule {
  +getDraft: (key: string) => Promise<string>;
  +updateDraft: (draft: Draft) => Promise<boolean>;
  +getAllDrafts: () => Promise<$ReadOnlyArray<Draft>>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CommTurboModule');
