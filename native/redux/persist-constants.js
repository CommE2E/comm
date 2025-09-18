// @flow

const rootKey = 'root';

// NOTE: renaming this constant requires updating
// `native/native_rust_library/build.rs` to correctly
// scrap Redux state version from this file.
const storeVersion = 97;

export { rootKey, storeVersion };
