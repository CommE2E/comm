// @flow

import * as React from 'react';

import { fetchThreadMedia } from 'lib/actions/thread-actions.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import css from './thread-settings-media-gallery.css';
import Tabs from '../../../components/tabs.react.js';
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
  const { onClose, parentThreadInfo, limit, activeTab } = props;
  const { id: threadID } = parentThreadInfo;
  const modalName = 'Media';

  const callFetchThreadMedia = useServerCall(fetchThreadMedia);
  const [mediaInfos, setMediaInfos] = React.useState([]);
  const [adjustedOffset, setAdjustedOffset] = React.useState(0);
  const [tab, setTab] = React.useState<MediaGalleryTab>(activeTab);

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia({
        threadID,
        limit,
        offset: 0,
        currentMediaIDs: [],
      });
      setMediaInfos(result.media);
      setAdjustedOffset(result.adjustedOffset);
    };
    fetchData();
  }, [callFetchThreadMedia, threadID, limit]);

  const filteredMediaInfos = React.useMemo(() => {
    if (tab === 'All') {
      return mediaInfos;
    } else if (tab === 'Images') {
      return mediaInfos.filter(mediaInfo => mediaInfo.type === 'photo');
    } else if (tab === 'Videos') {
      return mediaInfos.filter(mediaInfo => mediaInfo.type === 'video');
    }
    return mediaInfos;
  }, [tab, mediaInfos]);

  const mediaCoverPhotos = React.useMemo(() => {
    return filteredMediaInfos.map(media => {
      return media.thumbnailURI || media.uri;
    });
  }, [filteredMediaInfos]);

  const mediaGalleryItems = React.useMemo(() => {
    return filteredMediaInfos.map((media, i) => {
      return (
        <div key={i} className={css.mediaContainer}>
          <img src={mediaCoverPhotos[i]} className={css.media} />
        </div>
      );
    });
  }, [filteredMediaInfos, mediaCoverPhotos]);

  const handleScroll = React.useCallback(
    async event => {
      const container = event.target;
      // Load more data when the user is within 1000 pixels of the end
      const buffer = 1000;
      if (
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + buffer
      ) {
        const mediaIDs = mediaInfos.map(mediaInfo => String(mediaInfo.id));
        const thumbnailIDs = mediaInfos.map(
          mediaInfo => String(mediaInfo.thumbnailID) || '',
        );
        const currentMediaIDs = [...mediaIDs, ...thumbnailIDs];

        const result = await callFetchThreadMedia({
          threadID,
          limit,
          offset: adjustedOffset,
          currentMediaIDs,
        });
        setMediaInfos([...mediaInfos, ...result.media]);
        setAdjustedOffset(result.adjustedOffset);
      }
    },
    [callFetchThreadMedia, threadID, limit, adjustedOffset, mediaInfos],
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
