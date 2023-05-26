// @flow

import * as React from 'react';

import { fetchThreadMedia } from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
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
        const {
          holder,
          encryptionKey,
          thumbnailHolder,
          thumbnailEncryptionKey,
        } = media;
        mediaInfo = {
          ...mediaInfo,
          type: media.type,
          holder,
          encryptionKey,
          thumbnailHolder,
          thumbnailEncryptionKey,
        };
      }
      pushModal(<MultimediaModal media={mediaInfo} />);
    },
    [pushModal],
  );

  const filteredMediaInfos = React.useMemo(() => {
    if (tab === 'Images') {
      return mediaInfos.filter(
        mediaInfo =>
          mediaInfo.type === 'photo' || mediaInfo.type === 'encrypted_photo',
      );
    } else if (tab === 'Videos') {
      return mediaInfos.filter(
        mediaInfo =>
          mediaInfo.type === 'video' || mediaInfo.type === 'encrypted_video',
      );
    }
    return mediaInfos;
  }, [tab, mediaInfos]);

  const mediaCoverPhotos = React.useMemo(
    () =>
      filteredMediaInfos.map(media => {
        if (media.type === 'photo') {
          return {
            kind: 'plain',
            uri: media.uri,
            thumbHash: media.thumbHash,
          };
        } else if (media.type === 'video') {
          return {
            kind: 'plain',
            uri: media.thumbnailURI,
            thumbHash: media.thumbnailThumbHash,
          };
        } else if (media.type === 'encrypted_photo') {
          return {
            kind: 'encrypted',
            holder: media.holder,
            encryptionKey: media.encryptionKey,
            thumbHash: media.thumbHash,
          };
        } else {
          return {
            kind: 'encrypted',
            holder: media.thumbnailHolder,
            encryptionKey: media.thumbnailEncryptionKey,
            thumbHash: media.thumbnailThumbHash,
          };
        }
      }),
    [filteredMediaInfos],
  );

  const mediaGalleryItems = React.useMemo(
    () =>
      filteredMediaInfos.map((media, i) => (
        <GalleryItem
          key={i}
          onClick={() => onClick(media)}
          imageSource={mediaCoverPhotos[i]}
          imageCSSClass={css.media}
          imageContainerCSSClass={css.mediaContainer}
        />
      )),
    [filteredMediaInfos, onClick, mediaCoverPhotos],
  );

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
