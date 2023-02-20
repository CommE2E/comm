// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';

import css from './menu.css';

type MenuPosition = {
  +top: number,
  +left: number,
};
type Props = {
  +children: React.Node,
};
type MenuContextType = {
  +renderMenu: React.Node => void,
  +setMenuPosition: SetState<MenuPosition>,
  +closeMenu: symbol => void,
  +currentOpenMenu: ?symbol,
  +setCurrentOpenMenu: symbol => void,
};

const MenuContext: React.Context<MenuContextType> =
  React.createContext<MenuContextType>({
    renderMenu: () => {},
    setMenuPosition: () => {},
    closeMenu: () => {},
    currentOpenMenu: null,
    setCurrentOpenMenu: () => {},
  });

type Menu = {
  +node: ?React.Node,
  +symbol: ?symbol,
};

function MenuProvider(props: Props): React.Node {
  const { children } = props;
  const [menu, setMenu] = React.useState<Menu>({ node: null, symbol: null });
  const [position, setPosition] = React.useState<MenuPosition>({
    top: 0,
    left: 0,
  });

  const setMenuSymbol = React.useCallback(
    (newSymbol: symbol) =>
      setMenu(prevMenu => {
        if (prevMenu.symbol === newSymbol) {
          return prevMenu;
        }
        return { node: null, symbol: newSymbol };
      }),
    [],
  );

  const setMenuNode = React.useCallback(
    (newMenuNode: React.Node) =>
      setMenu(prevMenu => {
        if (prevMenu.node === newMenuNode) {
          return prevMenu;
        }
        return { ...prevMenu, node: newMenuNode };
      }),
    [],
  );

  const closeMenu = React.useCallback((menuToCloseSymbol: symbol) => {
    setMenu(currentMenu => {
      if (currentMenu.symbol === menuToCloseSymbol) {
        return { node: null, symbol: null };
      }
      return currentMenu;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      renderMenu: setMenuNode,
      setMenuPosition: setPosition,
      closeMenu,
      setCurrentOpenMenu: setMenuSymbol,
      currentOpenMenu: menu.symbol,
    }),
    [closeMenu, menu.symbol, setMenuNode, setMenuSymbol],
  );
  return (
    <>
      <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
      <div style={position} className={css.container}>
        {menu.node}
      </div>
    </>
  );
}

function useRenderMenu(): MenuContextType {
  const context = React.useContext(MenuContext);
  invariant(context, 'MenuContext not found');

  return context;
}

export { MenuProvider, useRenderMenu };
