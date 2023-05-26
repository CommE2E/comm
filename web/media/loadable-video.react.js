// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { Shape } from 'lib/types/core.js';

import { decryptMedia } from './encryption-utils.js';
import { preloadImage } from './media-utils.js';

type ThumbnailSource =
  | {
      +thumbnailURI: string,
    }
  | {
      +thumbnailHolder: string,
      +thumbnailEncryptionKey: string,
    };
type Props = {
  +uri: ?string,
  +thumbnailSource: ThumbnailSource,
  +thumbHashDataURL?: ?string,
  +elementStyle?: ?Shape<CSSStyleDeclaration>,
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
  const { thumbnailURI, thumbnailHolder, thumbnailEncryptionKey } =
    thumbnailSource;

  const [thumbnailImage, setThumbnailImage] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true,
      uriToDispose;
    setThumbnailImage(null);

    (async () => {
      if (thumbnailURI) {
        await preloadImage(thumbnailURI);
        if (isMounted) {
          setThumbnailImage(thumbnailURI);
        }
        return;
      }

      invariant(
        thumbnailHolder && thumbnailEncryptionKey,
        'invalid encrypted thumbnail source',
      );
      const { result } = await decryptMedia(
        thumbnailHolder,
        thumbnailEncryptionKey,
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
  }, [thumbnailURI, thumbnailHolder, thumbnailEncryptionKey]);

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
