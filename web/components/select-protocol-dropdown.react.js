// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import { protocols } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';

import ProtocolIcon from './protocol-icon.react.js';
import css from './select-protocol-dropdown.css';

function SelectProtocolDropdown(): React.Node {
  const { selectedProtocol, setSelectedProtocol, availableProtocols } =
    useProtocolSelection();

  const [showOptions, setShowOptions] = React.useState(false);

  const onDropdownPress = React.useCallback(() => {
    if (availableProtocols.length < 1) {
      return;
    }
    setShowOptions(!showOptions);
  }, [availableProtocols.length, showOptions]);

  const onOptionSelection = React.useCallback(
    (protocolName: ProtocolName) => {
      setSelectedProtocol(protocolName);
      setShowOptions(false);
    },
    [setSelectedProtocol],
  );

  const options = protocols()
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
    ));

  const containerClassNames = classNames(css.container, {
    [css.bordersWithOptions]: showOptions,
    [css.bordersWithoutOptions]: !showOptions,
    [css.disabled]: availableProtocols.length < 1,
  });

  let dropdownHeader = null;
  if (!selectedProtocol) {
    dropdownHeader = <span className={css.text}>Select chat type</span>;
  } else {
    dropdownHeader = (
      <div className={css.selectedOption}>
        <ProtocolIcon protocol={selectedProtocol} size={30} />
        <span className={css.protocolName}>{selectedProtocol}</span>
      </div>
    );
  }

  return (
    <div className={containerClassNames}>
      <div className={css.dropdownHeader} onClick={onDropdownPress}>
        {dropdownHeader}
        <SWMansionIcon
          icon={availableProtocols.length > 0 ? 'chevron-down' : 'info-circle'}
          size={14}
          className={css.chevron}
        />
      </div>
      {showOptions && <ul className={css.optionsContainer}>{options}</ul>}
    </div>
  );
}

export default SelectProtocolDropdown;
