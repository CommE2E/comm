// @flow

import { type Spec } from '../schema/CommCoreModuleSchema';

if (!global.CommCoreModule) {
  console.warn(
    'Comm Core Module has not been attached! ' +
      'Some functionalities may not work properly.',
  );
  const SpecImpl: Spec = {
    getDraft: () => Promise.resolve(''),
    updateDraft: () => Promise.resolve(false),
    moveDraft: () => Promise.resolve(false),
    getAllDrafts: () => Promise.resolve([]),
    removeAllDrafts: () => Promise.resolve(),
  };
  global.CommCoreModule = SpecImpl;
}
