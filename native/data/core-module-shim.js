// @flow

if (!global.CommCoreModule) {
  console.warn(
    'Comm Core Module has not been attached! ' +
      'Some functionalities may not work properly.',
  );
  global.CommCoreModule = {
    getDraft: () => '',
    updateDraft: () => {},
    getAllDrafts: () => Promise.resolve([]),
  };
}
