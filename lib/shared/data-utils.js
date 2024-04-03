// @flow

function shouldClearData(oldUserID: ?string, newUserID: ?string): boolean {
  return !!oldUserID && oldUserID !== newUserID;
}

export { shouldClearData };
