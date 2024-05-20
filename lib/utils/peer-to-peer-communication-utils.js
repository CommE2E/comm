// @flow

function getClientMessageIDFromTunnelbrokerMessageID(
  tunnelbrokerMessageID: string,
): string {
  const ids = tunnelbrokerMessageID.split('#');
  if (ids.length !== 2) {
    throw new Error('Invalid tunnelbrokerMessageID');
  }
  return ids[1];
}

export { getClientMessageIDFromTunnelbrokerMessageID };
