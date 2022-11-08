// @flow

type ElectronContextBridge = {
  // Returns a callback that you can call to remove the listener
  +onNavigate: OnNavigateListener => () => void,
  +clearHistory: () => void,
  +doubleClickTopBar: () => void,
  +setBadge: (value: string | number | null) => void,
};

type OnNavigateListener = ({
  +canGoBack: boolean,
  +canGoForward: boolean,
}) => void;

declare var electronContextBridge: ?ElectronContextBridge;

const electron: null | ElectronContextBridge =
  typeof electronContextBridge === 'undefined' ? null : electronContextBridge;

export default electron;
