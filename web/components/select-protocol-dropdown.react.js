// @flow

import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons/faInfoCircle.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import { protocols } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';
import { protocolInfoAlert } from 'lib/utils/alert-utils.js';

import ProtocolIcon from './protocol-icon.react.js';
import css from './select-protocol-dropdown.css';
import Modal from '../modals/modal.react.js';

function SelectProtocolDropdown(): React.Node {
  const { selectedProtocol, setSelectedProtocol, availableProtocols } =
    useProtocolSelection();
  const { pushModal, popModal } = useModalContext();

  const [showOptions, setShowOptions] = React.useState(false);

  const onDropdownPress = React.useCallback(() => {
    if (availableProtocols.length < 1) {
      return;
    }
    setShowOptions(!showOptions);
  }, [availableProtocols.length, showOptions]);

  const onInfoPress = React.useCallback(() => {
    pushModal(
      <Modal
        size="fit-content"
        name={protocolInfoAlert.title}
        onClose={popModal}
      >
        <div style={{ color: 'var(--fg)' }}>
          <p>{protocolInfoAlert.message}</p>
        </div>
      </Modal>,
    );
  }, [pushModal, popModal]);

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
      <div className={css.dropdownHeader}>
        <div
          onClick={onDropdownPress}
          style={{ display: 'flex', alignItems: 'center', flex: 1 }}
        >
          {dropdownHeader}
        </div>
        <FontAwesomeIcon
          icon={availableProtocols.length > 0 ? faChevronDown : faInfoCircle}
          size={14}
          className={css.chevron}
          onClick={
            availableProtocols.length > 0 ? onDropdownPress : onInfoPress
          }
          style={{ cursor: 'pointer' }}
        />
      </div>
      {showOptions && <ul className={css.optionsContainer}>{options}</ul>}
    </div>
  );
}

export default SelectProtocolDropdown;
