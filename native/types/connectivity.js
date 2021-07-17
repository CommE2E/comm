// @flow

export type ConnectivityInfo = {
  +connected: boolean,
  +hasWiFi: boolean,
};

export const defaultConnectivityInfo = {
  connected: true,
  hasWiFi: false,
};
