// @flow

// RootRouter
export const logInActionType = 'LOG_IN' as const;
export const logOutActionType = 'LOG_OUT' as const;
export const clearRootModalsActionType = 'CLEAR_ROOT_MODALS' as const;
export const setNavStateActionType = 'SET_NAV_STATE' as const;

// OverlayRouter
export const clearOverlayModalsActionType = 'CLEAR_OVERLAY_MODALS' as const;
export const setRouteParamsActionType = 'SET_ROUTE_PARAMS' as const;

// ChatRouter
export const clearScreensActionType = 'CLEAR_SCREENS' as const;
export const replaceWithThreadActionType = 'REPLACE_WITH_THREAD' as const;
export const clearThreadsActionType = 'CLEAR_THREADS' as const;
export const pushNewThreadActionType = 'PUSH_NEW_THREAD' as const;

// RegistrationRouter
export const reconnectEthereumActionType = 'RECONNECT_ETHEREUM' as const;
