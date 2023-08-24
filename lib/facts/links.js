// @flow

function inviteLinkUrl(secret: string): string {
  return `https://comm.app/invite/${secret}`;
}

function qrCodeLinkUrl(aes256Param: string, ed25519Param: string): string {
  const keys = {
    aes256: aes256Param,
    ed25519: ed25519Param,
  };
  const keysString = encodeURIComponent(JSON.stringify(keys));
  return `comm://qr-code/${keysString}`;
}

function parseKeysFromQRCodeURL(url: string): ?string {
  const urlRegex = /qr-code\/(\S+)$/;
  const match = urlRegex.exec(url);
  return match?.[1];
}

export { inviteLinkUrl, qrCodeLinkUrl, parseKeysFromQRCodeURL };
