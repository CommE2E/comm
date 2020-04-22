// @flow

const uniqueBaseID = Date.now();
let uuidCount = 0;
function getUUID() {
  return `${uniqueBaseID}-${uuidCount++}`;
}

export { getUUID };
