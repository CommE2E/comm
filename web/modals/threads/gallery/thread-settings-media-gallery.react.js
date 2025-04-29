// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useFetchThreadMedia } from 'lib/hooks/thread-hooks.js';
import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from 'lib/media/media-utils.js';
import type { Media } from 'lib/types/media-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import GalleryItem from './thread-settings-media-gallery-item.react.js';
import css from './thread-settings-media-gallery.css';
import Tabs, { type TabData } from '../../../components/tabs.react.js';
import MultimediaModal from '../../../media/multimedia-modal.react.js';
import Modal from '../../modal.react.js';

type MediaGalleryTab = 'All' | 'Images' | 'Videos';

const tabsData: $ReadOnlyArray<TabData<MediaGalleryTab>> = [
  {
    id: 'All',
    header: 'All',
  },
  {
    id: 'Images',
    header: 'Images',
  },
  {
    id: 'Videos',
    header: 'Videos',
  },
];

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

  const callFetchThreadMedia = useFetchThreadMedia();
  const [mediaInfos, setMediaInfos] = React.useState<$ReadOnlyArray<Media>>([]);
  const [tab, setTab] = React.useState<MediaGalleryTab>(activeTab);

  const tabs = React.useMemo(
    () => <Tabs tabItems={tabsData} activeTab={tab} setTab={setTab} />,
    [tab],
  );

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia({
        threadID,
        limit,
        offset: 0,
      });
      setMediaInfos(result.media);
    };
    void fetchData();
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

    if (filteredMediaInfos.length === 0) {
      return (
        <div className={css.noMedia}>
          No {tab === 'All' ? 'media' : tab.toLowerCase()} in this chat.
        </div>
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
    async (event: SyntheticEvent<HTMLDivElement>) => {
      const container = event.target;
      invariant(container instanceof HTMLDivElement, 'target not div');
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

  const tabContent = React.useMemo(
    () => (
      <div className={css.container} onScroll={handleScroll}>
        {mediaGalleryItems}
      </div>
    ),
    [handleScroll, mediaGalleryItems],
  );

  const threadSettingsMediaGalleryModal = React.useMemo(
    () => (
      <Modal name={modalName} subheader={tabs} onClose={onClose} size="large">
        {tabContent}
      </Modal>
    ),
    [onClose, tabContent, tabs],
  );

  return threadSettingsMediaGalleryModal;
}

export default ThreadSettingsMediaGalleryModal;
