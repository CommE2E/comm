// @flow

import invariant from 'invariant';

import { extractKeyserverIDFromID } from './action-utils.js';

function threadIDKeyserverIDExtractor(input: {
  +threadID: string,
  ...
}): string {
  const id = extractKeyserverIDFromID(input.threadID);
  invariant(id, 'keyserver data missing from request');
  return id;
}

function targetMessageKeyserverIDExtractor(request: {
  +targetMessageID: string,
  ...
}): string {
  const id = extractKeyserverIDFromID(request.targetMessageID);
  invariant(id, 'keyserver data missing from request');
  return id;
}

export { threadIDKeyserverIDExtractor, targetMessageKeyserverIDExtractor };
