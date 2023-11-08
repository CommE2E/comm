// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './menu.css';
import { useRenderMenu } from '../menu-provider.react.js';

type MenuVariant =
  | 'thread-actions'
  | 'member-actions'
  | 'community-actions'
  | 'role-actions'
  | 'user-profile';

type MenuProps = {
  +icon: React.Node,
  +children?: React.Node,
  +variant?: MenuVariant,
  +onChange?: boolean => void,
};

function Menu(props: MenuProps): React.Node {
  const buttonRef = React.useRef<?HTMLButtonElement>();
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
    [css.menuActionListCommunityActions]: variant === 'community-actions',
    [css.menuActionListRoleActions]: variant === 'role-actions',
    [css.userProfileActions]: variant === 'user-profile',
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
    (e: SyntheticEvent<HTMLButtonElement>) => {
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
      type="button"
    >
      {icon}
    </button>
  );
}

export default Menu;
