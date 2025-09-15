// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

import { useProtocolSelection } from 'lib/contexts/protocol-selection-context.js';
import { protocols } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec';
import { protocolInfoAlert } from 'lib/utils/alert-utils.js';

import ProtocolIcon from './protocol-icon.react.js';
import { useStyles } from '../themes/colors.js';

function SelectProtocolDropdown(): React.Node {
  const { selectedProtocol, setSelectedProtocol, availableProtocols } =
    useProtocolSelection();
  const styles = useStyles(unboundStyles);

  const [showOptions, setShowOptions] = React.useState(false);

  const onDropdownPress = React.useCallback(() => {
    if (availableProtocols.length < 1) {
      return;
    }
    setShowOptions(!showOptions);
  }, [availableProtocols.length, showOptions]);

  const onInfoPress = React.useCallback(() => {
    Alert.alert(protocolInfoAlert.title, protocolInfoAlert.message);
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
      return <Text style={styles.text}>Select chat type</Text>;
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
  ]);

  const iconName = React.useMemo(
    () => (availableProtocols.length > 0 ? 'chevron-down' : 'info-circle'),
    [availableProtocols.length],
  );

  const optionsComponent = React.useMemo(() => {
    if (!showOptions) {
      return null;
    }
    return <View style={styles.optionsContainer}>{options}</View>;
  }, [options, showOptions, styles.optionsContainer]);

  return (
    <View
      style={[
        styles.container,
        showOptions ? styles.bordersWithOptions : styles.bordersWithoutOptions,
      ]}
    >
      <View style={styles.dropdownHeader}>
        <TouchableOpacity onPress={onDropdownPress} style={styles.button}>
          {dropdownHeader}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={
            availableProtocols.length > 0 ? onDropdownPress : onInfoPress
          }
        >
          <Icon name={iconName} size={14} style={styles.icon} />
        </TouchableOpacity>
      </View>
      {optionsComponent}
    </View>
  );
}

const unboundStyles = {
  container: {
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
  icon: {
    color: 'panelForegroundLabel',
  },
};

export default SelectProtocolDropdown;
