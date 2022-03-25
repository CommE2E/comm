// @flow

import * as React from 'react';

import css from './menu.css';

type MenuProps = {
  +icon: React.Node,
  +children?: React.Node,
};

function Menu(props: MenuProps): React.Node {
  const [isOpen, setIsOpen] = React.useState(false);

  const { icon, children } = props;

  const closeMenuCallback = React.useCallback(() => {
    document.removeEventListener('click', closeMenuCallback);
    if (isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!document || !isOpen) {
      return undefined;
    }
    document.addEventListener('click', closeMenuCallback);
    return () => document.removeEventListener('click', closeMenuCallback);
  }, [closeMenuCallback, isOpen]);

  const switchMenuCallback = React.useCallback(() => {
    setIsOpen(isMenuOpen => !isMenuOpen);
  }, []);

  if (React.Children.count(children) === 0) {
    return null;
  }

  let menuActionList = null;
  if (isOpen) {
    menuActionList = <div className={css.menuActionList}>{children}</div>;
  }

  return (
    <div>
      <button className={css.menuButton} onClick={switchMenuCallback}>
        {icon}
      </button>
      {menuActionList}
    </div>
  );
}

export default Menu;
