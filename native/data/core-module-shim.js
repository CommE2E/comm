// @flow

if (!global.CommCoreModule) {
  global.CommCoreModule = {
    getDraft: () => '',
    updateDraft: () => {},
    getAllDrafts: () => Promise.resolve([]),
  };
}
