// @flow

import * as React from 'react';

import css from './info-block.css';
import Picture from './Picture.react';

type InfoBlockProps = {
  +title: string,
  +description: string,
  +url: string,
  +alt: string,
};
function InfoBlock(props: InfoBlockProps): React.Node {
  const { title, description, url, alt } = props;

  return (
    <div className={css.info_block}>
      <Picture {...{ url, alt }} />
      <div className={css.tile_title_row}>
        <p className={css.tile_title}>{title}</p>
      </div>
      <p className={css.description}>{description}</p>
    </div>
  );
}

export default InfoBlock;
