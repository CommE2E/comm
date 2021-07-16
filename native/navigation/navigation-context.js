// @flow

import type {
  CommonAction,
  PossiblyStaleNavigationState,
} from '@react-navigation/native';
import * as React from 'react';

import type { ChatRouterNavigationAction } from '../chat/chat-router';
import type { OverlayRouterNavigationAction } from './overlay-router';
import type { RootRouterNavigationAction } from './root-router';

export type NavAction =
  | CommonAction
  | RootRouterNavigationAction
  | ChatRouterNavigationAction
  | OverlayRouterNavigationAction;
export type NavContextType = {|
  +state: PossiblyStaleNavigationState,
  +dispatch: (action: NavAction) => void,
|};

const NavContext: React.Context<?NavContextType> = React.createContext<?NavContextType>(
  null,
);

export { NavContext };
