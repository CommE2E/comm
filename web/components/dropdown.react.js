// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './dropdown.css';

type DropdownOption = {
  +id: ?string,
  +name: string,
};

type DropdownProps = {
  +options: $ReadOnlyArray<DropdownOption>,
  +activeSelection: ?string,
  +setActiveSelection: (?string) => mixed,
};

function Dropdown(props: DropdownProps): React.Node {
  const { options, activeSelection, setActiveSelection } = props;
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleMenu = React.useCallback(() => setIsOpen(!isOpen), [isOpen]);

  const handleSelection = React.useCallback(
    selection => {
      setActiveSelection(selection.id);
      setIsOpen(false);
    },
    [setActiveSelection],
  );

  const activeDisplayedOption = React.useMemo(() => {
    const activeOption = options.find(option => option.id === activeSelection);
    return activeOption ? activeOption.name : null;
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
        <div className={css.dropdownMenu}>
          <p className={css.dropdownDisplayText}>{activeDisplayedOption}</p>
          <div className={css.dropdownIcon}>
            <SWMansionIcon
              icon={isOpen ? 'chevron-up' : 'chevron-down'}
              color="white"
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
