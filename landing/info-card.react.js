// @flow

import * as React from 'react';

import css from './landing.css';

type InfoCardProps = {
  +label: string,
  +active: boolean,
  +icon: React.Node,
  +description: string,
  +baseStyle: string,
};
function InfoCard(props: InfoCardProps): React.Node {
  const { label, active, icon, description, baseStyle } = props;
  return (
    <div className={active ? `${baseStyle} ${css.active_card}` : baseStyle}>
      <div className={css.tile_title_row}>
        {icon}
        <p className={css.tile_title}>{label}</p>
      </div>
      <p>{description}</p>
    </div>
  );
}

export default InfoCard;
