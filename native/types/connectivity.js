// @flow

import PropTypes from 'prop-types';

export type ConnectivityInfo = {|
  connected: boolean,
  hasWiFi: boolean,
|};

export const connectivityInfoPropType = PropTypes.shape({
  connected: PropTypes.bool.isRequired,
  hasWiFi: PropTypes.bool.isRequired,
});

export const defaultConnectivityInfo = {
  connected: true,
  hasWiFi: false,
};
