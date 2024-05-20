// @flow

function getClientMessageIDFromTunnelbrokerMessageID(
  clientMessageID: string,
): string {
  return clientMessageID.split('#')[1];
}

export { getClientMessageIDFromTunnelbrokerMessageID };
