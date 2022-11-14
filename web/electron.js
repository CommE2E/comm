// @flow

declare var electronContextBridge;

const electron: null | {
  onNavigate: (
    (event: any, { canGoBack: boolean, canGoForward: boolean }) => void,
  ) => void,
  setBadge: (value: string | number | null) => void,
  onTopBarDoubleClick: () => {},
} = typeof electronContextBridge === 'undefined' ? null : electronContextBridge;

export default electron;
