// @flow

const uniqueBaseID = `id-${Date.now()}`;
let uuidCount = 0;
function getUUID() {
  return `${uniqueBaseID}-${uuidCount++}`;
}

export { getUUID };
