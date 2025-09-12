// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec';

import ProtocolIcon from './protocol-icon.react.js';
import {
  protocols,
} from 'lib/shared/threads/protocols/thread-protocols.js';
import { useStyles } from '../themes/colors.js';

function SelectProtocolDropdown(): React.Node {
  const { selectedProtocol, setSelectedProtocol, availableProtocols } =
    useProtocolSelection();
  const styles = useStyles(unboundStyles);

  const [showOptions, setShowOptions] = React.useState(false);

  const onDropdownPress = React.useCallback(() => {
    setShowOptions(!showOptions);
  }, [showOptions]);

  const onOptionSelection = React.useCallback(
    (protocolIndex: ProtocolName) => {
      setSelectedProtocol(protocolIndex);
      setShowOptions(false);
    },
    [setSelectedProtocol],
  );

  const options = protocols()
    .filter(protocol => availableProtocols.includes(protocol.protocolName))
    .map(protocol => (
      <TouchableOpacity
        onPress={() => onOptionSelection(protocol.protocolName)}
        key={protocol.protocolName}
      >
        <View key={protocol.protocolName} style={styles.dropdownOption}>
          <ProtocolIcon protocol={protocol.protocolName} size={24} />
          <Text style={styles.protocolName}>{protocol.protocolName}</Text>
        </View>
      </TouchableOpacity>
    ));

  let dropdownHeader = null;
  if (!selectedProtocol) {
    dropdownHeader = <Text style={styles.text}>Select chat type</Text>;
  } else {
    dropdownHeader = (
      <View key={selectedProtocol} style={styles.selectedOption}>
        <ProtocolIcon protocol={selectedProtocol} size={24} />
        <Text style={styles.protocolName}>{selectedProtocol}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        showOptions ? styles.bordersWithOptions : styles.bordersWithoutOptions,
      ]}
    >
      <TouchableOpacity onPress={onDropdownPress}>
        <View style={styles.dropdownHeader}>
          {dropdownHeader}
          <Icon
            name={
              availableProtocols.length > 0 ? 'chevron-down' : 'info-circle'
            }
            size={14}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
      {showOptions && <View style={styles.optionsContainer}>{options}</View>}
    </View>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'selectProtocolDropdownBackground',
    zIndex: 1000,
  },
  bordersWithOptions: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  bordersWithoutOptions: {
    borderRadius: 10,
  },
  dropdownHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  optionsContainer: {
    backgroundColor: 'selectProtocolDropdownBackground',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    position: 'absolute',
    top: 43,
    width: '100%',
  },
  text: {
    fontSize: 16,
    color: 'panelForegroundLabel',
    height: 24,
    textAlignVertical: 'center',
  },
  protocolName: {
    marginLeft: 8,
    fontSize: 16,
    color: 'panelForegroundLabel',
  },
  chevron: {
    color: 'panelForegroundLabel',
  },
};

export default SelectProtocolDropdown;
