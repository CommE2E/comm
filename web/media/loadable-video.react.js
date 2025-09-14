// @flow

import invariant from 'invariant';
import * as React from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

import type { Dimensions } from 'lib/types/media-types.js';

import { useFetchAndDecryptMedia } from './encryption-utils.js';
import { preloadImage } from './media-utils.js';
import type { CSSStyle } from '../types/styles.js';

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
  +loop?: boolean,
  +dimensions?: ?Dimensions,
};

function LoadableVideo(
  props: Props,
  videoRef: React.RefSetter<HTMLVideoElement>,
): React.Node {
  const {
    uri,
    thumbHashDataURL,
    thumbnailSource,
    elementStyle,
    multimediaClassName,
    loop,
    dimensions,
  } = props;
  const { thumbnailURI, thumbnailBlobURI, thumbnailEncryptionKey } =
    thumbnailSource;

  const [thumbnailImage, setThumbnailImage] = React.useState<?string>(null);

  const fetchAndDecryptMedia = useFetchAndDecryptMedia();

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
  }, [
    thumbnailURI,
    thumbnailBlobURI,
    thumbnailEncryptionKey,
    fetchAndDecryptMedia,
  ]);

  const poster = thumbnailImage ?? thumbHashDataURL;

  const hlsPlayer = React.useMemo(() => {
    if (!uri || !uri.endsWith('.m3u8')) {
      return null;
    }
    const videoJsOptions = {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: false,
      loop,
      videoWidth: dimensions?.width,
      videoHeight: dimensions?.height,
      poster,
      sources: [
        {
          src: uri,
          type: 'application/x-mpegURL',
        },
      ],
    };
    return (
      <HlsVideo
        options={videoJsOptions}
        elementStyle={elementStyle}
        multimediaClassName={multimediaClassName}
      />
    );
  }, [uri, elementStyle, multimediaClassName, loop, poster, dimensions]);

  if (hlsPlayer) {
    return hlsPlayer;
  }

  let videoSource;
  if (uri) {
    videoSource = <source src={uri} />;
  }
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

type HlsVideoProps = {
  +options: any,
  +onReady?: any => void,
  +elementStyle?: ?Partial<CSSStyle>,
  +multimediaClassName?: string,
};

function HlsVideo(props: HlsVideoProps): React.Node {
  const containerRef = React.useRef<?HTMLDivElement>(null);
  const playerRef = React.useRef<?any>(null);
  const { options, onReady, elementStyle, multimediaClassName } = props;

  React.useEffect(() => {
    if (!playerRef.current) {
      const videoElement: any = document.createElement('video-js');

      if (elementStyle) {
        videoElement.style = elementStyle;
      }
      if (multimediaClassName) {
        videoElement.classList.add(multimediaClassName);
      }
      containerRef.current?.appendChild(videoElement);

      const player: any = videojs(videoElement, options, () => {
        onReady?.(player);
      });
      playerRef.current = player;
    } else {
      const player = playerRef.current;

      player.autoplay(options.autoplay);
      player.src(options.sources);
      player.loop(options.loop);
      player.poster(options.poster);
      player.videoWidth(options.videoWidth);
      player.videoHeight(options.videoHeight);
    }
  }, [options, onReady, elementStyle, multimediaClassName]);

  React.useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <div ref={containerRef} />
    </div>
  );
}

type MemoizedLoadableVideoComponentType = component(
  ref: React.RefSetter<HTMLVideoElement>,
  ...Props
);

const MemoizedLoadableVideo: MemoizedLoadableVideoComponentType = React.memo<
  Props,
  React.RefSetter<HTMLVideoElement>,
>(React.forwardRef<Props, HTMLVideoElement>(LoadableVideo));

export default MemoizedLoadableVideo;
