// @flow

const rootKey = 'root';
const rootKeyPrefix = 'persist:';
const completeRootKey = `${rootKeyPrefix}${rootKey}`;
const storeVersion = 75;
const nonUserSpecificFieldsWeb = [
  'loadingStatuses',
  'windowDimensions',
  'lifecycleState',
  'windowActive',
  'pushApiPublicKey',
  'keyserverStore',
  'initialStateLoaded',
  '_persist',
  'customServer',
];

export {
  rootKey,
  rootKeyPrefix,
  completeRootKey,
  storeVersion,
  nonUserSpecificFieldsWeb,
};
