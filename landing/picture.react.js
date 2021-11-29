// @flow

import * as React from 'react';

type PictureProps = {
  +path: string,
  +alt: string,
};

function Picture(props: PictureProps): React.Node {
  const { path, alt } = props;
  return (
    <picture>
      <source srcSet={`${path}.webp`} type="image/webp" />
      <source srcSet={`${path}.png`} type="image/png" />
      <img src={`${path}.png`} alt={alt} />
    </picture>
  );
}

export default Picture;
