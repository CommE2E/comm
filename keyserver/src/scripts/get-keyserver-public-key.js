// @flow

import { main } from './utils.js';
import { getContentPublicKey } from '../utils/olm-utils.js';

// Outputs the keyserver's signing ed25519 public key
async function getKeyserverPublicKey() {
  const contentPublicKey = await getContentPublicKey();
  console.log(contentPublicKey);
}

main([getKeyserverPublicKey]);
