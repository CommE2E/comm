// @flow

const alertTypes = Object.freeze({
  NOTIF_PERMISSION: 'notif-permission',
  CONNECT_FARCASTER: 'connect-farcaster',
});

type AlertType = $Values<typeof alertTypes>;

export type AlertInfo = {
  +totalAlerts: number,
  +lastAlertTime: number,
};

export type AlertInfos = {
  +[alertID: AlertType]: AlertInfo,
};

export type AlertStore = {
  +alertInfos: AlertInfos,
};

const defaultAlertInfo: AlertInfo = {
  totalAlerts: 0,
  lastAlertTime: 0,
};

const defaultAlertInfos: AlertInfos = Object.freeze({
  [alertTypes.NOTIF_PERMISSION]: defaultAlertInfo,
  [alertTypes.CONNECT_FARCASTER]: defaultAlertInfo,
});

export { alertTypes, defaultAlertInfo, defaultAlertInfos };
