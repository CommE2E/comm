// @flow

import * as React from 'react';

import css from './info-card.css';

type InfoCardProps = {
  +title: string,
  +description: string,
  +baseStyle: string,
};
function InfoCard(props: InfoCardProps): React.Node {
  const { title, description, baseStyle } = props;

  return (
    <div className={`${baseStyle} ${css.info_card}`}>
      <div className={css.tile_title_row}>
        <p className={css.tile_title}>{title}</p>
      </div>
      <p className={css.description}>{description}</p>
    </div>
  );
}

export default InfoCard;
