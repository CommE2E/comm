// @flow

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Waypoint } from 'react-waypoint';

import css from './landing.css';

type InfoCardProps = {
  +idx: number,
  +active: boolean,
  +label: string,
  +icon: mixed,
  +description: string,
  +baseStyle: string,
  +setActiveCardIdx: number => void,
};
function InfoCard(props: InfoCardProps): React.Node {
  const {
    idx,
    active,
    label,
    icon,
    description,
    baseStyle,
    setActiveCardIdx,
  } = props;

  const onTopPositionChange = React.useCallback(
    obj => {
      if (
        obj.previousPosition === 'above' &&
        obj.currentPosition === 'inside'
      ) {
        setActiveCardIdx(idx);
      } else if (
        obj.previousPosition === 'inside' &&
        obj.currentPosition === 'above'
      ) {
        setActiveCardIdx(idx + 1);
      }
    },
    [idx, setActiveCardIdx],
  );

  const onBottomPositionChange = React.useCallback(
    obj => {
      if (
        obj.previousPosition === 'below' &&
        obj.currentPosition === 'inside'
      ) {
        setActiveCardIdx(idx);
      } else if (
        obj.previousPosition === 'inside' &&
        obj.currentPosition === 'below'
      ) {
        setActiveCardIdx(idx - 1);
      }
    },
    [idx, setActiveCardIdx],
  );

  return (
    <div className={active ? `${baseStyle} ${css.active_card}` : baseStyle}>
      <Waypoint onPositionChange={onTopPositionChange} />
      <div className={css.tile_title_row}>
        <FontAwesomeIcon size="2x" color="#ffffff" icon={icon} />
        <p className={css.tile_title}>{label}</p>
      </div>
      <p>{description}</p>
      <Waypoint onPositionChange={onBottomPositionChange} />
    </div>
  );
}

export default InfoCard;
