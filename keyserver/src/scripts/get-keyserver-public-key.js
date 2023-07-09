// @flow

import { main } from './utils.js';
import { fetchOlmAccount } from '../updaters/olm-account-updater.js';

// Outputs the keyserver's signing ed25519 public key
async function getKeyserverPublicKey() {
  const info = await fetchOlmAccount('content');
  console.log(JSON.parse(info.account.identity_keys()).ed25519);
}

main([getKeyserverPublicKey]);
