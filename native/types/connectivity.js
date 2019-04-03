// @flow

import PropTypes from 'prop-types';

export type ConnectivityInfo = {|
  connected: bool,
  hasWiFi: bool,
|};

export const connectivityInfoPropType = PropTypes.shape({
  connected: PropTypes.bool.isRequired,
  hasWiFi: PropTypes.bool.isRequired,
});

export const defaultConnectivityInfo = {
  connected: true,
  hasWiFi: false,
};
