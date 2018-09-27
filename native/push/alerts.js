// @flow

import PropTypes from 'prop-types';

export type NotifPermissionAlertInfo = {|
  totalAlerts: number,
  lastAlertTime: number,
|};

const notifPermissionAlertInfoPropType = PropTypes.shape({
  totalAlerts: PropTypes.number.isRequired,
  lastAlertTime: PropTypes.number.isRequired,
});

const defaultNotifPermissionAlertInfo: NotifPermissionAlertInfo = {
  totalAlerts: 0,
  lastAlertTime: 0,
};

export {
  defaultNotifPermissionAlertInfo,
  notifPermissionAlertInfoPropType,
};
