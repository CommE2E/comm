// @flow

import * as React from 'react';

import css from './landing.css';

type InfoCardProps = {
  +title: string,
  +description: string,
  +baseStyle: string,
};
function InfoCard(props: InfoCardProps): React.Node {
  const { title, description, baseStyle } = props;

  return (
    <div className={baseStyle}>
      <div className={css.tile_title_row}>
        <p className={css.tile_title}>{title}</p>
      </div>
      <p>{description}</p>
    </div>
  );
}

export default InfoCard;
