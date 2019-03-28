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
