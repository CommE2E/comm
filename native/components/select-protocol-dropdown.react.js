// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/FontAwesome5.js';

import { useStyles } from '../themes/colors.js';
import { protocols } from '../../lib/shared/threads/protocols/thread-protocols';
import ProtocolIcon from './protocol-icon.react.js';

function SelectProtocolDropdown(): React.Node {
  const styles = useStyles(unboundStyles);

  const [showOptions, setShowOptions] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<null | number>(
    null,
  );

  const onDropdownPress = React.useCallback(() => {
    setShowOptions(!showOptions);
  }, [showOptions]);

  const onOptionSelection = React.useCallback((protocolIndex: number) => {
    setSelectedOption(protocolIndex);
    setShowOptions(false);
  }, []);

  const options = protocols().map((protocol, protocolIndex) => (
    <TouchableOpacity
      onPress={() => onOptionSelection(protocolIndex)}
      key={protocolIndex}
    >
      <View key={protocol.protocolName} style={styles.dropdownOption}>
        <ProtocolIcon protocol={protocolIndex} size={30} />
        <Text style={styles.protocolName}>{protocol.protocolName}</Text>
      </View>
    </TouchableOpacity>
  ));

  let dropdownHeader = null;

  if (selectedOption === null) {
    dropdownHeader = <Text style={styles.text}>Select chat type</Text>;
  } else {
    const protocol = protocols()[selectedOption];
    dropdownHeader = (
      <View key={protocol.protocolName} style={styles.selectedOption}>
        <ProtocolIcon protocol={selectedOption} size={30} />
        <Text style={styles.protocolName}>{protocol.protocolName}</Text>
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
          <Icon name="chevron-down" size={14} style={styles.chevron} />
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
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 18,
    color: 'panelForegroundLabel',
  },
  protocolName: {
    marginLeft: 8,
    fontSize: 18,
    color: 'panelForegroundLabel',
  },
  chevron: {
    color: 'panelForegroundLabel',
  },
};

export default SelectProtocolDropdown;
