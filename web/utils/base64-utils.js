// @flow

function base64EncodeBuffer(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function base64DecodeBuffer(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  return new Uint8Array(binaryString.length).map((_, i) =>
    binaryString.charCodeAt(i),
  );
}

export { base64EncodeBuffer, base64DecodeBuffer };
