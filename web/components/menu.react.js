// @flow

import classnames from 'classnames';
import * as React from 'react';

import { useRenderMenu } from '../menu-provider.react.js';
import css from './menu.css';

type MenuVariant = 'thread-actions' | 'member-actions';

type MenuProps = {
  +icon: React.Node,
  +children?: React.Node,
  +variant?: MenuVariant,
  +onChange?: boolean => void,
};

function Menu(props: MenuProps): React.Node {
  const buttonRef = React.useRef();
  const {
    renderMenu,
    setMenuPosition,
    closeMenu,
    setCurrentOpenMenu,
    currentOpenMenu,
  } = useRenderMenu();
  const { icon, children, variant = 'thread-actions', onChange } = props;
  const ourSymbol = React.useRef(Symbol());
  const menuActionListClasses = classnames(css.menuActionList, {
    [css.menuActionListThreadActions]: variant === 'thread-actions',
    [css.menuActionListMemberActions]: variant === 'member-actions',
  });

  const menuActionList = React.useMemo(
    () => <div className={menuActionListClasses}>{children}</div>,
    [children, menuActionListClasses],
  );

  const isOurMenuOpen = currentOpenMenu === ourSymbol.current;

  const updatePosition = React.useCallback(() => {
    if (buttonRef.current && isOurMenuOpen) {
      const { top, left } = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top, left });
    }
  }, [isOurMenuOpen, setMenuPosition]);

  React.useEffect(() => {
    if (!window) {
      return undefined;
    }

    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [updatePosition]);

  React.useEffect(updatePosition, [updatePosition]);

  const closeMenuCallback = React.useCallback(() => {
    closeMenu(ourSymbol.current);
  }, [closeMenu]);

  React.useEffect(() => {
    onChange?.(isOurMenuOpen);
  }, [isOurMenuOpen, onChange]);

  React.useEffect(() => {
    if (!isOurMenuOpen) {
      return undefined;
    }
    document.addEventListener('click', closeMenuCallback);
    return () => {
      document.removeEventListener('click', closeMenuCallback);
    };
  }, [closeMenuCallback, isOurMenuOpen]);

  const prevActionListRef = React.useRef<React.Node>(null);
  React.useEffect(() => {
    if (!isOurMenuOpen) {
      prevActionListRef.current = null;
      return;
    }
    if (prevActionListRef.current === menuActionList) {
      return;
    }
    renderMenu(menuActionList);

    prevActionListRef.current = menuActionList;
  }, [isOurMenuOpen, menuActionList, renderMenu]);

  React.useEffect(() => {
    const ourSymbolValue = ourSymbol.current;
    return () => closeMenu(ourSymbolValue);
  }, [closeMenu]);

  const onClickMenuCallback = React.useCallback(
    e => {
      e.stopPropagation();
      setCurrentOpenMenu(ourSymbol.current);
    },
    [setCurrentOpenMenu],
  );

  if (React.Children.count(children) === 0) {
    return null;
  }

  return (
    <button
      ref={buttonRef}
      className={css.menuButton}
      onClick={onClickMenuCallback}
    >
      {icon}
    </button>
  );
}

export default Menu;
