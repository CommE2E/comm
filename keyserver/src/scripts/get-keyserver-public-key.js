// @flow

import { main } from './utils.js';
import { getContentSigningKey } from '../utils/olm-utils.js';

// Outputs the keyserver's signing ed25519 public key
async function getKeyserverPublicKey() {
  const contentSigningKey = await getContentSigningKey();
  console.log(contentSigningKey);
}

main([getKeyserverPublicKey]);
