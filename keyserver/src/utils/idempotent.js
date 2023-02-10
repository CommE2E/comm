// @flow

import type { Viewer } from '../session/viewer.js';

function creationString(viewer: Viewer, localID: string): string {
  return `${viewer.session}|${localID}`;
}

function localIDFromCreationString(
  viewer: ?Viewer,
  ourCreationString: ?string,
): ?string {
  if (!ourCreationString || !viewer || !viewer.hasSessionInfo) {
    return null;
  }
  const [session, localID] = ourCreationString.split('|');
  return session === viewer.session ? localID : null;
}

export { creationString, localIDFromCreationString };
