// @flow

import * as React from 'react';

import type { Shape } from 'lib/types/core.js';

import { preloadImage } from './media-utils.js';

type Props = {
  +uri: ?string,
  +thumbnailURI: ?string,
  +thumbHashDataURL?: ?string,
  +elementStyle?: ?Shape<CSSStyleDeclaration>,
};

function LoadableVideo(props: Props): React.Node {
  const { uri, thumbHashDataURL, thumbnailURI, elementStyle } = props;

  const [isVideoLoaded, setVideoLoaded] = React.useState(false);
  const handleVideoLoad = React.useCallback(() => setVideoLoaded(true), []);
  React.useEffect(() => {
    // video thumbnail is used as a poster image when the video is loaded
    // preload it so the browser can immediately load it from cache
    if (thumbnailURI) {
      preloadImage(thumbnailURI);
    }
  }, [thumbnailURI]);

  const poster = isVideoLoaded ? thumbnailURI : thumbHashDataURL;
  return (
    <video
      controls
      poster={poster}
      style={elementStyle}
      onLoadedData={handleVideoLoad}
    >
      <source src={uri} />
    </video>
  );
}

const MemoizedLoadableVideo: React.ComponentType<Props> =
  React.memo<Props>(LoadableVideo);

export default MemoizedLoadableVideo;
