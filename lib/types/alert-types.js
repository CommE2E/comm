// @flow

const alertTypes = Object.freeze({
  NOTIF_PERMISSION: 'notif-permission',
  CONNECT_FARCASTER: 'connect-farcaster',
  SIWE_BACKUP_MESSAGE: 'siwe-backup-message',
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

export type RecordAlertActionPayload = {
  +alertType: AlertType,
  +time: number,
};

const defaultAlertInfo: AlertInfo = {
  totalAlerts: 0,
  lastAlertTime: 0,
};

const defaultAlertInfos: AlertInfos = Object.freeze({
  [alertTypes.NOTIF_PERMISSION]: defaultAlertInfo,
  [alertTypes.CONNECT_FARCASTER]: defaultAlertInfo,
  [alertTypes.SIWE_BACKUP_MESSAGE]: defaultAlertInfo,
});

export { alertTypes, defaultAlertInfo, defaultAlertInfos };
