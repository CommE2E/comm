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

  const mediaCoverPhotos = React.useMemo(
    () => filteredMediaInfos.map(media => media.thumbnailURI || media.uri),
    [filteredMediaInfos],
  );

  const mediaGalleryItems = React.useMemo(
    () =>
      filteredMediaInfos.map((media, i) => (
        <div key={i} className={css.mediaContainer}>
          <img src={mediaCoverPhotos[i]} className={css.media} />
        </div>
      )),
    [filteredMediaInfos, mediaCoverPhotos],
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
