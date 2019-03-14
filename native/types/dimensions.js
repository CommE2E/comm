// @flow

import PropTypes from 'prop-types';

export type Dimensions = {|
  height: number,
  width: number,
|};

export const dimensionsPropType = PropTypes.shape({
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
});
