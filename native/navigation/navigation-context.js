// @flow

import type {
  CommonAction,
  PossiblyStaleNavigationState,
} from '@react-navigation/native';
import type { RootRouterNavigationAction } from './root-router';
import type { ChatRouterNavigationAction } from '../chat/chat-router';
import type { OverlayRouterNavigationAction } from './overlay-router';

import * as React from 'react';

export type NavAction =
  | CommonAction
  | RootRouterNavigationAction
  | ChatRouterNavigationAction
  | OverlayRouterNavigationAction;
export type NavContextType = {|
  +state: PossiblyStaleNavigationState,
  +dispatch: (action: NavAction) => void,
|};

const NavContext = React.createContext<?NavContextType>(null);

export { NavContext };
