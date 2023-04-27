// @flow

/**
 * Converts a base64 string to base64url format specified in RFC 4648 § 5.
 */
function toBase64Url(
  base64String: string,
  stripPadding: boolean = true,
): string {
  const base64Url = base64String.replace(/\+/g, '-').replace(/\//g, '_');

  if (!stripPadding) {
    return base64Url;
  }
  return base64Url.replace(/=/g, '');
}

export { toBase64Url };
