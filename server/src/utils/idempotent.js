// @flow

import type { Viewer } from '../session/viewer';

function creationString(viewer: Viewer, localID: string) {
  return `${viewer.session}|${localID}`;
}

export {
  creationString,
};
