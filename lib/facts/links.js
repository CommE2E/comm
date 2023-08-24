// @flow

const inviteLinkUrlPrefix = 'https://comm.app/invite/';
function inviteLinkUrl(secret: string): string {
  return `${inviteLinkUrlPrefix}${secret}`;
}

const qrCodeLinkUrlPrefix = 'comm://qr-code/';
function qrCodeLinkUrl(aes256Param: string, ed25519Param: string): string {
  const keys = {
    aes256: aes256Param,
    ed25519: ed25519Param,
  };
  const keysString = encodeURIComponent(JSON.stringify(keys));
  return `${qrCodeLinkUrlPrefix}${keysString}`;
}

export {
  inviteLinkUrlPrefix,
  inviteLinkUrl,
  qrCodeLinkUrlPrefix,
  qrCodeLinkUrl,
};
