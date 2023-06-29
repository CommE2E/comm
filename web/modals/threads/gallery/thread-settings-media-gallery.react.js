// @flow

import * as React from 'react';

import { fetchThreadMedia } from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from 'lib/media/media-utils.js';
import type { Media } from 'lib/types/media-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import GalleryItem from './thread-settings-media-gallery-item.react.js';
import css from './thread-settings-media-gallery.css';
import Tabs from '../../../components/tabs.react.js';
import MultimediaModal from '../../../media/multimedia-modal.react.js';
import Modal from '../../modal.react.js';

type MediaGalleryTab = 'All' | 'Images' | 'Videos';

type ThreadSettingsMediaGalleryModalProps = {
  +onClose: () => void,
  +parentThreadInfo: ThreadInfo,
  +limit: number,
  +activeTab: MediaGalleryTab,
};

function ThreadSettingsMediaGalleryModal(
  props: ThreadSettingsMediaGalleryModalProps,
): React.Node {
  const { pushModal } = useModalContext();
  const { onClose, parentThreadInfo, limit, activeTab } = props;
  const { id: threadID } = parentThreadInfo;
  const modalName = 'Media';

  const callFetchThreadMedia = useServerCall(fetchThreadMedia);
  const [mediaInfos, setMediaInfos] = React.useState([]);
  const [tab, setTab] = React.useState<MediaGalleryTab>(activeTab);

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia({
        threadID,
        limit,
        offset: 0,
      });
      setMediaInfos(result.media);
    };
    fetchData();
  }, [callFetchThreadMedia, threadID, limit]);

  const onClick = React.useCallback(
    (media: Media) => {
      const thumbHash = media.thumbnailThumbHash ?? media.thumbHash;
      let mediaInfo = {
        thumbHash,
        dimensions: media.dimensions,
      };
      if (media.type === 'photo' || media.type === 'video') {
        const { uri, thumbnailURI } = media;
        mediaInfo = {
          ...mediaInfo,
          type: media.type,
          uri,
          thumbnailURI,
        };
      } else {
        const { encryptionKey, thumbnailEncryptionKey } = media;
        const thumbnailBlobURI =
          media.type === 'encrypted_video'
            ? encryptedVideoThumbnailBlobURI(media)
            : null;
        mediaInfo = {
          ...mediaInfo,
          type: media.type,
          blobURI: encryptedMediaBlobURI(media),
          encryptionKey,
          thumbnailBlobURI,
          thumbnailEncryptionKey,
        };
      }
      pushModal(<MultimediaModal media={mediaInfo} />);
    },
    [pushModal],
  );

  const mediaGalleryItems = React.useMemo(() => {
    let filteredMediaInfos = mediaInfos;
    if (tab === 'Images') {
      filteredMediaInfos = mediaInfos.filter(
        mediaInfo =>
          mediaInfo.type === 'photo' || mediaInfo.type === 'encrypted_photo',
      );
    } else if (tab === 'Videos') {
      filteredMediaInfos = mediaInfos.filter(
        mediaInfo =>
          mediaInfo.type === 'video' || mediaInfo.type === 'encrypted_video',
      );
    }

    return filteredMediaInfos.map((media, i) => {
      let imageSource;
      if (media.type === 'photo') {
        imageSource = {
          kind: 'plain',
          uri: media.uri,
          thumbHash: media.thumbHash,
        };
      } else if (media.type === 'video') {
        imageSource = {
          kind: 'plain',
          uri: media.thumbnailURI,
          thumbHash: media.thumbnailThumbHash,
        };
      } else if (media.type === 'encrypted_photo') {
        imageSource = {
          kind: 'encrypted',
          blobURI: encryptedMediaBlobURI(media),
          encryptionKey: media.encryptionKey,
          thumbHash: media.thumbHash,
        };
      } else {
        imageSource = {
          kind: 'encrypted',
          blobURI: encryptedVideoThumbnailBlobURI(media),
          encryptionKey: media.thumbnailEncryptionKey,
          thumbHash: media.thumbnailThumbHash,
        };
      }

      return (
        <GalleryItem
          key={i}
          onClick={() => onClick(media)}
          imageSource={imageSource}
          imageCSSClass={css.media}
          imageContainerCSSClass={css.mediaContainer}
        />
      );
    });
  }, [tab, mediaInfos, onClick]);

  const handleScroll = React.useCallback(
    async event => {
      const container = event.target;
      // Load more data when the user is within 1000 pixels of the end
      const buffer = 1000;

      if (
        container.scrollHeight - container.scrollTop >
        container.clientHeight + buffer
      ) {
        return;
      }

      const result = await callFetchThreadMedia({
        threadID,
        limit,
        offset: mediaInfos.length,
      });
      setMediaInfos([...mediaInfos, ...result.media]);
    },
    [callFetchThreadMedia, threadID, limit, mediaInfos],
  );

  return (
    <Modal name={modalName} onClose={onClose} size="large">
      <Tabs.Container activeTab={tab} setTab={setTab}>
        <Tabs.Item id="All" header="All">
          <div className={css.container} onScroll={handleScroll}>
            {mediaGalleryItems}
          </div>
        </Tabs.Item>
        <Tabs.Item id="Images" header="Images">
          <div className={css.container} onScroll={handleScroll}>
            {mediaGalleryItems}
          </div>
        </Tabs.Item>
        <Tabs.Item id="Videos" header="Videos">
          <div className={css.container} onScroll={handleScroll}>
            {mediaGalleryItems}
          </div>
        </Tabs.Item>
      </Tabs.Container>
    </Modal>
  );
}

export default ThreadSettingsMediaGalleryModal;
