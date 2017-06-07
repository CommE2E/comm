// @flow

let curLocalID = 0;

function setHighestLocalID(localID: number) {
  if (localID > curLocalID) {
    curLocalID = localID;
  }
}

function getNewLocalID() {
  return curLocalID++;
}

export {
  setHighestLocalID,
  getNewLocalID,
};
