// @flow
/* eslint-disable no-undef */
/* eslint-disable curly */
if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';
if (typeof process === 'undefined') {
  global.process = require('process');
} else {
  const bProcess = require('process');
  for (var p in bProcess) {
    if (!(p in process)) {
      /* $FlowIgnore[prop-missing] */
      process[p] = bProcess[p];
    }
  }
}

/* $FlowIgnore[prop-missing] */
process.browser = false;
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer;

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
process.env['NODE_ENV'] = isDev ? 'development' : 'production';
if (typeof localStorage !== 'undefined') {
  // eslint-disable-next-line no-undef
  /* $FlowIgnore[prop-missing] */
  localStorage.debug = isDev ? '*' : '';
}

// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
// require('stream')
require('crypto');
