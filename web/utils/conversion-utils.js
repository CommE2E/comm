// @flow

function convertObjToBytes<T>(obj: T): Uint8Array {
  const objStr = JSON.stringify(obj);
  return new TextEncoder().encode(objStr ?? '');
}

function convertBytesToObj<T>(bytes: Uint8Array): T {
  const str = new TextDecoder().decode(bytes.buffer);
  return JSON.parse(str);
}

export { convertObjToBytes, convertBytesToObj };
