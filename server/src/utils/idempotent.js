// @flow

import type { Viewer } from '../session/viewer';

function creationString(viewer: Viewer, localID: string) {
  return `${viewer.session}|${localID}`;
}

function localIDFromCreationString(viewer: ?Viewer, creationString: ?string) {
  if (!creationString || !viewer || !viewer.hasSessionInfo) {
    return null;
  }
  const [ session, localID ] = creationString.split('|');
  return session === viewer.session ? localID : null;
}

export {
  creationString,
  localIDFromCreationString,
};
