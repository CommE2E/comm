// @flow

import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useStyles } from '../../themes/colors.js';

type RegistrationTileContextType = { +selected: boolean };
const defaultRegistrationTileContext = { selected: false };
const RegistrationTileContext =
  React.createContext<RegistrationTileContextType>(
    defaultRegistrationTileContext,
  );

type TileProps = {
  +children: React.Node,
  +selected: boolean,
  +onSelect: () => mixed,
};
function RegistrationTile(props: TileProps): React.Node {
  const { children, selected, onSelect } = props;

  const [body, header] = React.useMemo(() => {
    let registrationBody = children;
    let registrationHeader;
    if (Array.isArray(children)) {
      registrationBody = [];
      for (const child of children) {
        if (child.type.name === RegistrationTileHeader.name) {
          registrationHeader = React.cloneElement(child);
        } else {
          registrationBody.push(child);
        }
      }
    }
    return [registrationBody, registrationHeader];
  }, [children]);

  const registrationTileContext = React.useMemo(
    () => ({ selected }),
    [selected],
  );

  const styles = useStyles(unboundStyles);
  const tileStyle = React.useMemo(
    () => (selected ? [styles.tile, styles.selectedTile] : styles.tile),
    [styles, selected],
  );

  return (
    <RegistrationTileContext.Provider value={registrationTileContext}>
      <TouchableOpacity
        onPress={onSelect}
        activeOpacity={0.6}
        style={tileStyle}
      >
        {header}
        {body}
      </TouchableOpacity>
    </RegistrationTileContext.Provider>
  );
}

type HeaderProps = {
  +children: React.Node,
};
function RegistrationTileHeader(props: HeaderProps): React.Node {
  const { children } = props;
  const { selected } = React.useContext(RegistrationTileContext);

  const styles = useStyles(unboundStyles);
  const tileRadioStyle = React.useMemo(
    () =>
      selected
        ? [styles.tileRadio, styles.selectedTileRadio]
        : styles.tileRadio,
    [styles, selected],
  );
  const tileRadioInnerStyle = React.useMemo(
    () => (selected ? styles.tileRadioInner : undefined),
    [styles, selected],
  );

  return (
    <View style={styles.tileTitle}>
      {children}
      <View style={tileRadioStyle}>
        <View style={tileRadioInnerStyle} />
      </View>
    </View>
  );
}

const unboundStyles = {
  tile: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 8,
    marginTop: 24,
    borderWidth: 1,
    backgroundColor: 'panelForeground',
  },
  selectedTile: {
    borderColor: 'panelForegroundLabel',
  },
  tileTitle: {
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileRadio: {
    borderColor: 'panelSecondaryForegroundBorder',
    borderWidth: 1,
    height: 24,
    width: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileRadioInner: {
    backgroundColor: 'panelForegroundLabel',
    height: 16,
    width: 16,
    borderRadius: 8,
  },
  selectedTileRadio: {
    borderColor: 'panelForegroundLabel',
  },
};

export { RegistrationTile, RegistrationTileHeader };
