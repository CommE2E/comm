// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../themes/colors.js';

type TileProps = {
  +children: React.Node,
};
function RegistrationTile(props: TileProps): React.Node {
  const { children } = props;

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

  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.tile}>
      {header}
      {body}
    </View>
  );
}

type HeaderProps = {
  +children: React.Node,
};
function RegistrationTileHeader(props: HeaderProps): React.Node {
  const { children } = props;

  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.tileTitle}>
      {children}
      <View style={styles.tileRadio} />
    </View>
  );
}

const unboundStyles = {
  tile: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 8,
    marginTop: 24,
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
  },
};

export { RegistrationTile, RegistrationTileHeader };
