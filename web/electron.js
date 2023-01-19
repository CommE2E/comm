// @flow

import type { ElectronBridge } from 'lib/types/electron-types';

declare var electronContextBridge: void | ElectronBridge;

const electron: null | ElectronBridge =
  typeof electronContextBridge === 'undefined' ? null : electronContextBridge;

export default electron;
