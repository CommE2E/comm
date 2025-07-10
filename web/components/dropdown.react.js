// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';

import css from './dropdown.css';

export type DropdownOption = {
  +id: string,
  +name: string,
};

type DropdownProps = {
  +options: $ReadOnlyArray<DropdownOption>,
  +activeSelection: ?string,
  +setActiveSelection: string => mixed,
  +defaultLabel?: string,
  +disabled?: boolean,
};

function Dropdown(props: DropdownProps): React.Node {
  const {
    options,
    activeSelection,
    setActiveSelection,
    defaultLabel,
    disabled,
  } = props;

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(() =>
    options.findIndex(option => option.id === activeSelection),
  );

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
    (selection: DropdownOption, index: number) => {
      setActiveSelection(selection.id);
      setSelectedIndex(index);
      setIsOpen(false);
    },
    [setActiveSelection],
  );

  const dropdownList = React.useMemo(() => {
    if (!isOpen) {
      return null;
    }

    const dropdownOptions = options.map((option, index) => {
      const checkIcon =
        option.id === activeSelection ? (
          <SWMansionIcon icon="check" size={18} />
        ) : null;

      return (
        <li
          className={css.dropdownListItem}
          key={option.id}
          onClick={() => handleSelection(option, index)}
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

  const selectedOptionText =
    selectedIndex > -1
      ? options[selectedIndex].name
      : (defaultLabel ?? 'Select an option');

  return (
    <>
      <div className={css.dropdownContainer} onClick={toggleMenu}>
        <div className={dropdownMenuClassNames}>
          <p className={dropdownTextClassNames}>{selectedOptionText}</p>
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
