// @flow

import PropTypes from 'prop-types';

export type VerticalBounds = $ReadOnly<{|
  y: number,
  height: number,
|}>;

export const verticalBoundsPropType = PropTypes.shape({
  y: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
});

export type LayoutCoordinates = $ReadOnly<{|
  x: number,
  y: number,
  width: number,
  height: number,
|}>;

export const layoutCoordinatesPropType = PropTypes.shape({
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
});
