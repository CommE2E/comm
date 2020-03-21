// @flow

import type { Viewer } from '../session/viewer';

function creationString(viewer: Viewer, localID: string) {
  return `${viewer.session}|${localID}`;
}

function localIDFromCreationString(
  viewer: ?Viewer,
  ourCreationString: ?string,
) {
  if (!ourCreationString || !viewer || !viewer.hasSessionInfo) {
    return null;
  }
  const [session, localID] = ourCreationString.split('|');
  return session === viewer.session ? localID : null;
}

export { creationString, localIDFromCreationString };
