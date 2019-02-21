// @flow

import type { Media } from '../types/media-types';
import type {
  MultimediaMessageInfo,
  RawMultimediaMessageInfo,
} from '../types/message-types';

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
      return "some media";
    }
  }
  invariant(firstType, "there should be some media");
  return `some ${firstType}s`;
}

function multimediaMessagePreview(
  messageInfo: MultimediaMessageInfo | RawMultimediaMessageInfo,
): string {
  const mediaContentString = contentStringForMediaArray(messageInfo.media);
  return `sent ${mediaContentString}`;
}

export {
  contentStringForMediaArray,
  multimediaMessagePreview,
};
