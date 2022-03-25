// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './menu.css';

type MenuVariant = 'thread-actions' | 'member-actions';

type MenuProps = {
  +icon: React.Node,
  +children?: React.Node,
  +variant?: MenuVariant,
};

function Menu(props: MenuProps): React.Node {
  const [isOpen, setIsOpen] = React.useState(false);

  const { icon, children, variant = 'thread-actions' } = props;

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
    const menuActionListClasses = classnames(css.menuActionList, {
      [css.menuActionListThreadActions]: variant === 'thread-actions',
      [css.menuActionListMemberActions]: variant === 'member-actions',
    });

    menuActionList = <div className={menuActionListClasses}>{children}</div>;
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
