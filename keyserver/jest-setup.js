// @flow

import crypto from 'crypto';

// crypto.webcrypto was introduced in Node 15.10.0.
// It is not defined in Flow so we need a cast
global.crypto = (crypto: any).webcrypto;
