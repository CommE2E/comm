// @flow

import * as React from 'react';

import css from './landing.css';
import Picture from './picture.react';

type InfoBlockProps = {
  +label: string,
  +description: string,
  +label: string,
  +path: string,
  +alt: string,
  +imageClassName: string,
  +infoClassName: string,
};

function InfoBlock(props: InfoBlockProps): React.Node {
  const {
    label,
    description,
    path,
    alt,
    imageClassName,
    infoClassName,
  } = props;

  return (
    <>
      <div className={imageClassName}>
        <Picture path={path} alt={alt} />
      </div>
      <div className={infoClassName}>
        <div className={css.tile_title_row}>
          <h2 className={css.tile_title}>{label}</h2>
        </div>
        <p>{description}</p>
      </div>
    </>
  );
}

export default InfoBlock;
