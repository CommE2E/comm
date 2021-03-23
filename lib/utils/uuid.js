// @flow

const uniqueBaseID = Date.now();
let uuidCount = 0;
function getUUID(): string {
  return `${uniqueBaseID}-${uuidCount++}`;
}

export { getUUID };
