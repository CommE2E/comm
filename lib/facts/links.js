// @flow

/* Invite Links */
function inviteLinkUrl(secret: string): string {
  return `https://comm.app/invite/${secret}`;
}

function parseSecretFromInviteLinkURL(url: string): ?string {
  const urlRegex = /invite\/(\S+)$/;
  const match = urlRegex.exec(url);
  return match?.[1];
}

function parseInstallReferrerFromInviteLinkURL(referrer: string): ?string {
  const referrerRegex = /utm_source=(invite\/(\S+))$/;
  const match = referrerRegex.exec(referrer);
  return match?.[1];
}

/* QR Code */
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

export {
  inviteLinkUrl,
  parseSecretFromInviteLinkURL,
  parseInstallReferrerFromInviteLinkURL,
  qrCodeLinkUrl,
  parseKeysFromQRCodeURL,
};
