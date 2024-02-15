// @flow

import * as React from 'react';

type PictureProps = {
  +url: string,
  +alt: string,
};

function Picture(props: PictureProps): React.Node {
  const { url, alt } = props;
  return (
    <picture>
      <source srcSet={`${url}.webp`} type="image/webp" />
      <source srcSet={`${url}.png`} type="image/png" />
      <img src={`${url}.png`} alt={alt} />
    </picture>
  );
}

export default Picture;
