// @flow

type OnNavigateListener = ({
  +canGoBack: boolean,
  +canGoForward: boolean,
}) => void;

export type ElectronBridge = {
  // Returns a callback that you can call to remove the listener
  +onNavigate: OnNavigateListener => () => void,
  +clearHistory: () => void,
  +doubleClickTopBar: () => void,
  +setBadge: (number | string | null) => void,
};
