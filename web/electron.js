// @flow

declare var electronContextBridge;

type OnNavigateListener = ({
  +canGoBack: boolean,
  +canGoForward: boolean,
}) => void;

const electron: null | {
  // Returns a callback that you can call to remove the listener
  +onNavigate: OnNavigateListener => () => void,
  +clearHistory: () => void,
} = typeof electronContextBridge === 'undefined' ? null : electronContextBridge;

export default electron;
