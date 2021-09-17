// @flow

import type { Media, ClientDBMediaInfo } from '../types/media-types';

function translateMediaToClientDBMediaInfo(media: Media): ClientDBMediaInfo {
  return {
    id: media.id,
    uri: media.uri,
    type: media.type,
    extras: JSON.stringify({
      dimensions: media.dimensions,
      loop: media.type === 'video' ? media.loop : false,
      local_media_selection: media.localMediaSelection,
    }),
  };
}

export { translateMediaToClientDBMediaInfo };
