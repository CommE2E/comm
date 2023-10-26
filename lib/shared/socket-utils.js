// @flow

import { tunnnelbrokerURL } from '../facts/tunnelbroker.js';

function createOpenSocketFunction(baseURL: string): () => WebSocket {
  const [protocol, address] = baseURL.split('://');
  const prefix = protocol === 'https' ? 'wss' : 'ws';
  const endpoint = `${prefix}://${address}/ws`;
  return () => new WebSocket(endpoint);
}

function createTunnelbrokerSocket(): WebSocket {
  return new WebSocket(tunnnelbrokerURL);
}

export { createOpenSocketFunction, createTunnelbrokerSocket };
