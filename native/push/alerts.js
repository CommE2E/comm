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

const recordNotifPermissionAlertActionType = "RECORD_NOTIF_PERMISSION_ALERT";

export {
  defaultNotifPermissionAlertInfo,
  notifPermissionAlertInfoPropType,
  recordNotifPermissionAlertActionType,
};
