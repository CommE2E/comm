// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

type Draft = {|
  +key: string,
  +text: string,
|};

export interface Spec extends TurboModule {
  +getDraft: (key: string) => string;
  +updateDraft: (draft: Draft) => boolean;
  +getAllDrafts: () => $ReadOnlyArray<Draft>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CommTurboModule');
