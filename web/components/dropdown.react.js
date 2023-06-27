// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './dropdown.css';

type DropdownOption = {
  +id: string,
  +name: string,
};

type DropdownProps = {
  +options: $ReadOnlyArray<DropdownOption>,
  +activeSelection: string,
  +setActiveSelection: string => mixed,
  +disabled?: boolean,
};

function Dropdown(props: DropdownProps): React.Node {
  const { options, activeSelection, setActiveSelection, disabled } = props;
  const [isOpen, setIsOpen] = React.useState(false);

  const dropdownMenuClassNames = classNames({
    [css.dropdownMenu]: true,
    [css.dropdownDisabled]: !!disabled,
  });

  const dropdownTextClassNames = classNames({
    [css.dropdownDisplayText]: true,
    [css.dropdownDisabled]: !!disabled,
  });

  const dropdownIconClassNames = classNames({
    [css.dropdownIcon]: true,
    [css.dropdownDisabled]: !!disabled,
  });

  const toggleMenu = React.useCallback(() => {
    if (disabled) {
      return;
    }

    setIsOpen(!isOpen);
  }, [disabled, isOpen]);

  const handleSelection = React.useCallback(
    selection => {
      setActiveSelection(selection.id);
      setIsOpen(false);
    },
    [setActiveSelection],
  );

  const activeDisplayedOption = React.useMemo(() => {
    const activeOption = options.find(option => option.id === activeSelection);
    invariant(activeOption, 'Active option must be in options list');
    return activeOption.name;
  }, [activeSelection, options]);

  const dropdownList = React.useMemo(() => {
    if (!isOpen) {
      return null;
    }

    const dropdownOptions = options.map(option => {
      const checkIcon =
        option.id === activeSelection ? (
          <SWMansionIcon icon="check" size={18} />
        ) : null;

      return (
        <li
          className={css.dropdownListItem}
          key={option.id}
          onClick={() => handleSelection(option)}
        >
          <button className={css.dropdownListItemButton}>
            <p className={css.dropdownListDisplayText}>{option.name}</p>
          </button>
          <div className={css.dropdownListCheckIcon}>{checkIcon}</div>
        </li>
      );
    });

    return <ul className={css.dropdownList}>{dropdownOptions}</ul>;
  }, [activeSelection, handleSelection, isOpen, options]);

  return (
    <>
      <div className={css.dropdownContainer} onClick={toggleMenu}>
        <div className={dropdownMenuClassNames}>
          <p className={dropdownTextClassNames}>{activeDisplayedOption}</p>
          <div className={dropdownIconClassNames}>
            <SWMansionIcon
              icon={isOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
            />
          </div>
        </div>
      </div>
      {dropdownList}
    </>
  );
}

export default Dropdown;
