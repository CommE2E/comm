// @flow

import * as React from 'react';

import css from './landing.css';

type InfoCardProps = {
  +label: string,
  +description: string,
};
function InfoCard(props: InfoCardProps): React.Node {
  const { label, description } = props;

  return (
    <div>
      <div className={css.tile_title_row}>
        <h2 className={css.tile_title}>{label}</h2>
      </div>
      <p>{description}</p>
    </div>
  );
}

export default InfoCard;
