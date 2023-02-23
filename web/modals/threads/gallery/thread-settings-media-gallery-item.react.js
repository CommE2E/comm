// @flow

import * as React from 'react';

import type { Media } from 'lib/types/media-types';

import css from './thread-settings-media-gallery-item.css';
import Modal from '../../modal.react.js';

type ThreadSettingsMediaGalleryItemModalProps = {
  +onClose: () => void,
  +media: Media,
};

function ThreadSettingsMediaGalleryItemModal(
  props: ThreadSettingsMediaGalleryItemModalProps,
): React.Node {
  const { onClose, media } = props;
  const modalName = '';

  const mediaSource = React.useMemo(() => media.uri, [media]);

  const renderedMedia = React.useMemo(() => {
    if (media.type === 'photo') {
      return <img src={mediaSource} className={css.mediaItem} />;
    }
    return (
      <video
        src={mediaSource}
        className={css.mediaItem}
        controls
        autoPlay
        loop
        muted
      />
    );
  }, [media, mediaSource]);

  return (
    <div>
      <Modal
        name={modalName}
        transparent={true}
        withCloseButton={false}
        onClose={onClose}
        size="large"
      >
        <div className={css.backContainer}>
          <p className={css.backButton} onClick={onClose}>
            {'< Back'}
          </p>
        </div>
        <div className={css.mediaContainer}>{renderedMedia}</div>
      </Modal>
    </div>
  );
}

export default ThreadSettingsMediaGalleryItemModal;
