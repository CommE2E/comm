// @flow

import type { Media } from '../types/media-types';

import invariant from 'invariant';

function contentStringForMediaArray(media: $ReadOnlyArray<Media>): string {
  invariant(media.length > 0, "there should be some media");
  if (media.length === 1) {
    return `a ${media[0].type}`;
  }
  let firstType;
  for (let single of media) {
    if (!firstType) {
      firstType = single.type;
    }
    if (firstType === single.type) {
      continue;
    } else {
      return "media";
    }
  }
  invariant(firstType, "there should be some media");
  return `${firstType}s`;
}

export {
  contentStringForMediaArray,
};
