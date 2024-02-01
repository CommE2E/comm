// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useCommServicesAuthMetadata } from 'lib/hooks/account-hooks.js';

import { fetchAndDecryptMedia } from './encryption-utils.js';
import { preloadImage } from './media-utils.js';
import type { CSSStyle } from '../types/styles';

type ThumbnailSource =
  | {
      +thumbnailURI: string,
    }
  | {
      +thumbnailBlobURI: string,
      +thumbnailEncryptionKey: string,
    };
type Props = {
  +uri: ?string,
  +thumbnailSource: ThumbnailSource,
  +thumbHashDataURL?: ?string,
  +elementStyle?: ?Partial<CSSStyle>,
  +multimediaClassName?: string,
};

function LoadableVideo(props: Props, videoRef: React.Ref<'video'>): React.Node {
  const {
    uri,
    thumbHashDataURL,
    thumbnailSource,
    elementStyle,
    multimediaClassName,
  } = props;
  const { thumbnailURI, thumbnailBlobURI, thumbnailEncryptionKey } =
    thumbnailSource;

  const [thumbnailImage, setThumbnailImage] = React.useState<?string>(null);
  const authMedatata = useCommServicesAuthMetadata();

  React.useEffect(() => {
    let isMounted = true,
      uriToDispose;
    setThumbnailImage(null);

    void (async () => {
      if (thumbnailURI) {
        await preloadImage(thumbnailURI);
        if (isMounted) {
          setThumbnailImage(thumbnailURI);
        }
        return;
      }

      invariant(
        thumbnailBlobURI && thumbnailEncryptionKey,
        'invalid encrypted thumbnail source',
      );
      const { result } = await fetchAndDecryptMedia(
        thumbnailBlobURI,
        thumbnailEncryptionKey,
        authMedatata,
      );
      if (isMounted && result.success) {
        setThumbnailImage(result.uri);
        uriToDispose = result.uri;
      }
    })();

    return () => {
      isMounted = false;
      if (uriToDispose) {
        URL.revokeObjectURL(uriToDispose);
      }
    };
  }, [thumbnailURI, thumbnailBlobURI, thumbnailEncryptionKey, authMedatata]);

  let videoSource;
  if (uri) {
    videoSource = <source src={uri} />;
  }
  const poster = thumbnailImage ?? thumbHashDataURL;
  return (
    <video
      controls
      poster={poster}
      className={multimediaClassName}
      style={elementStyle}
      ref={videoRef}
    >
      {videoSource}
    </video>
  );
}

const MemoizedLoadableVideo: React.AbstractComponent<Props, HTMLVideoElement> =
  React.memo<Props, HTMLVideoElement>(
    React.forwardRef<Props, HTMLVideoElement>(LoadableVideo),
  );

export default MemoizedLoadableVideo;
