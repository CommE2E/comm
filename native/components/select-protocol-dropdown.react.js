// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import { protocols } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec';

import ProtocolIcon from './protocol-icon.react.js';
import { useStyles } from '../themes/colors.js';

function SelectProtocolDropdown(): React.Node {
  const { selectedProtocol, setSelectedProtocol, availableProtocols } =
    useProtocolSelection();
  const styles = useStyles(unboundStyles);

  const [showOptions, setShowOptions] = React.useState(false);

  const onDropdownPress = React.useCallback(() => {
    setShowOptions(currentShowOptions => !currentShowOptions);
  }, []);

  const onOptionSelection = React.useCallback(
    (protocolIndex: ProtocolName) => {
      setSelectedProtocol(protocolIndex);
      setShowOptions(false);
    },
    [setSelectedProtocol],
  );

  const options = React.useMemo(
    () =>
      protocols()
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
        )),
    [
      availableProtocols,
      onOptionSelection,
      styles.dropdownOption,
      styles.protocolName,
    ],
  );

  const dropdownHeader = React.useMemo(() => {
    if (!selectedProtocol) {
      return (
        <View style={styles.textContainer}>
          <Text style={styles.text}>Select chat type</Text>
        </View>
      );
    }
    return (
      <View key={selectedProtocol} style={styles.selectedOption}>
        <ProtocolIcon protocol={selectedProtocol} size={24} />
        <Text style={styles.protocolName}>{selectedProtocol}</Text>
      </View>
    );
  }, [
    selectedProtocol,
    styles.protocolName,
    styles.selectedOption,
    styles.text,
    styles.textContainer,
  ]);

  const optionsComponent = React.useMemo(() => {
    if (!showOptions) {
      return null;
    }
    return <View style={styles.optionsContainer}>{options}</View>;
  }, [options, showOptions, styles.optionsContainer]);

  const containerStyle = React.useMemo(
    () => [
      styles.container,
      showOptions ? styles.bordersWithOptions : styles.bordersWithoutOptions,
    ],
    [
      styles.container,
      styles.bordersWithOptions,
      styles.bordersWithoutOptions,
      showOptions,
    ],
  );

  if (availableProtocols.length === 0) {
    return null;
  }

  return (
    <View style={containerStyle}>
      <View style={styles.dropdownHeader}>
        <TouchableOpacity onPress={onDropdownPress} style={styles.button}>
          {dropdownHeader}
        </TouchableOpacity>
        <TouchableOpacity onPress={onDropdownPress}>
          <Icon name="chevron-down" size={14} style={styles.icon} />
        </TouchableOpacity>
      </View>
      {optionsComponent}
    </View>
  );
}

const unboundStyles = {
  container: {
    marginHorizontal: 4,
    marginVertical: 8,
    backgroundColor: 'selectProtocolDropdownBackground',
    zIndex: 4,
  },
  button: {
    flex: 1,
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
  textContainer: {
    justifyContent: 'center',
    height: 24,
  },
  text: {
    fontSize: 16,
    color: 'panelForegroundLabel',
    textAlignVertical: 'center',
  },
  protocolName: {
    marginLeft: 8,
    fontSize: 16,
    color: 'panelForegroundLabel',
  },
  icon: {
    color: 'panelForegroundLabel',
  },
};

export default SelectProtocolDropdown;
