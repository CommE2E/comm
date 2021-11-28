// @flow

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import css from './landing.css';

type InfoCardProps = {
  +label: string,
  +icon: mixed,
  +description: string,
  +baseStyle: string,
};
function InfoCard(props: InfoCardProps): React.Node {
  const { label, icon, description, baseStyle } = props;

  return (
    <div className={baseStyle}>
      <div className={css.tile_title_row}>
        <FontAwesomeIcon size="2x" color="#ffffff" icon={icon} />
        <p className={css.tile_title}>{label}</p>
      </div>
      <p>{description}</p>
    </div>
  );
}

export default InfoCard;
