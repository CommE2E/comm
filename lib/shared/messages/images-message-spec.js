// @flow

import type { ImagesMessageData } from '../../types/message/images';
import type { MessageSpec } from './message-spec';

export const imagesMessageSpec: MessageSpec<ImagesMessageData> = Object.freeze({
  messageContent(data) {
    const mediaIDs = data.media.map((media) => parseInt(media.id, 10));
    return JSON.stringify(mediaIDs);
  },
});
