// @flow

// This file defines the version of both web and keyserver. Today they are
// deployed together, so their version are sourced from the same place.

// This version number should not be changed without also changing CODE_VERSION
// in keyserver/addons/rust-node-addon/src/identity_client/mod.rs
export const webAndKeyserverCodeVersion = 33;
