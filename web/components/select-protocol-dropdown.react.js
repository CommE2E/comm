// @flow

import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import { protocolNames } from 'lib/shared/protocol-names.js';
import { protocols } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';

import ProtocolIcon from './protocol-icon.react.js';
import css from './select-protocol-dropdown.css';

function SelectProtocolDropdown(): React.Node {
  const { selectedProtocol, setSelectedProtocol, availableProtocols } =
    useProtocolSelection();
  const [showOptions, setShowOptions] = React.useState(false);

  const onDropdownPress = React.useCallback(() => {
    setShowOptions(currentShowOptions => !currentShowOptions);
  }, []);

  const onOptionSelection = React.useCallback(
    (protocolName: ProtocolName) => {
      setSelectedProtocol(protocolName);
      setShowOptions(false);
    },
    [setSelectedProtocol],
  );

  const options = React.useMemo(
    () =>
      protocols()
        .filter(protocol => availableProtocols.includes(protocol.protocolName))
        .map(protocol => (
          <li
            className={css.dropdownOption}
            key={protocol.protocolName}
            onClick={() => onOptionSelection(protocol.protocolName)}
          >
            <div className={css.optionContent}>
              <ProtocolIcon protocol={protocol.protocolName} size={30} />
              <span className={css.protocolName}>{protocol.protocolName}</span>
            </div>
          </li>
        )),
    [availableProtocols, onOptionSelection],
  );

  const containerClassNames = classNames(css.container, {
    [css.bordersWithOptions]: showOptions,
    [css.bordersWithoutOptions]: !showOptions,
  });

  const dropdownHeader = React.useMemo(() => {
    if (!selectedProtocol || selectedProtocol === protocolNames.KEYSERVER) {
      return <span className={css.text}>Select chat type</span>;
    }
    return (
      <div className={css.selectedOption}>
        <ProtocolIcon protocol={selectedProtocol} size={30} />
        <span className={css.protocolName}>{selectedProtocol}</span>
      </div>
    );
  }, [selectedProtocol]);

  const optionsComponent = React.useMemo(() => {
    if (!showOptions) {
      return null;
    }
    return <ul className={css.optionsContainer}>{options}</ul>;
  }, [options, showOptions]);

  if (availableProtocols.length === 0) {
    return null;
  }

  return (
    <div className={containerClassNames}>
      <div className={css.dropdownHeader}>
        <div onClick={onDropdownPress} className={css.headerClickableArea}>
          {dropdownHeader}
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          size={14}
          onClick={onDropdownPress}
          className={classNames(css.chevron, css.iconClickable)}
        />
      </div>
      {optionsComponent}
    </div>
  );
}

export default SelectProtocolDropdown;
