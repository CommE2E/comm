// @flow

const alertTypes = Object.freeze({
  NOTIF_PERMISSION: 'notif-permission',
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

export { alertTypes, defaultAlertInfo };
