// @flow

import * as React from 'react';

import css from './info-block.css';
import Picture from './Picture.react.js';

type InfoBlockProps = {
  +title: string,
  +description: string,
  +url: string,
  +alt: string,
  +imageStyle: string,
  +infoStyle: string,
};
function InfoBlock(props: InfoBlockProps): React.Node {
  const { title, description, url, alt, imageStyle, infoStyle } = props;

  return (
    <>
      <div className={imageStyle}>
        <Picture alt={alt} url={url} />
      </div>
      <div className={`${css.info_block} ${infoStyle}`}>
        <p className={css.title}>{title}</p>
        <p className={css.description}>{description}</p>
      </div>
    </>
  );
}

export default InfoBlock;
