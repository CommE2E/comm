// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useStyles } from '../../themes/colors.js';

type TileProps = {
  +children: React.Node,
};
function RegistrationTile(props: TileProps): React.Node {
  const { children } = props;

  let body = children;
  let header;
  if (Array.isArray(children)) {
    body = [];
    for (const child of children) {
      if (child.type === RegistrationTileHeader) {
        header = child;
      } else {
        body.push(child);
      }
    }
  }

  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.tile}>
      <View style={styles.tileTitle}>
        {header}
        <View style={styles.tileRadio} />
      </View>
      {body}
    </View>
  );
}

type HeaderProps = {
  +children: React.Node,
};
function RegistrationTileHeader(props: HeaderProps): React.Node {
  return props.children;
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
