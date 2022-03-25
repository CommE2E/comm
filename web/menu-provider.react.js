// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { SetState } from 'lib/types/hook-types';

import css from './menu.css';

type MenuPosition = {
  +top: number,
  +left: number,
};
type Props = {
  +children: React.Node,
};
type MenuContextType = {
  +renderMenu: SetState<React.Node>,
  +setMenuPosition: SetState<MenuPosition>,
  +closeMenu: React.Node => void,
  +currentOpenMenu: symbol,
  +setCurrentOpenMenu: SetState<symbol>,
};

const MenuContext: React.Context<MenuContextType> = React.createContext<MenuContextType>(
  {
    renderMenu: () => {},
    setMenuPosition: () => {},
    closeMenu: () => {},
    currentOpenMenu: Symbol(),
    setCurrentOpenMenu: () => {},
  },
);

function MenuProvider(props: Props): React.Node {
  const { children } = props;
  const [menu, setMenu] = React.useState(null);
  const [currentOpenMenu, setCurrentOpenMenu] = React.useState<symbol>(
    Symbol(),
  );
  const [position, setPosition] = React.useState<MenuPosition>({
    top: 0,
    left: 0,
  });

  const closeMenu = React.useCallback((menuToClose: React.Node) => {
    setCurrentOpenMenu(Symbol());
    setMenu(oldMenu => {
      if (oldMenu === menuToClose) {
        return null;
      } else {
        return oldMenu;
      }
    });
  }, []);

  const value = React.useMemo(
    () => ({
      renderMenu: setMenu,
      setMenuPosition: setPosition,
      closeMenu,
      setCurrentOpenMenu,
      currentOpenMenu,
    }),
    [closeMenu, currentOpenMenu],
  );
  return (
    <>
      <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
      <div style={position} className={css.container}>
        {menu}
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
