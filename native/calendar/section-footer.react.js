// @flow

import * as React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';

import Button from '../components/button.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { type Colors, useStyles, useColors } from '../themes/colors.js';

type BaseProps = {
  +dateString: string,
  +onAdd: (dateString: string) => void,
  +onPressWhitespace: () => void,
};
type Props = {
  ...BaseProps,
  +colors: Colors,
  +styles: typeof unboundStyles,
};
class SectionFooter extends React.PureComponent<Props> {
  render() {
    return (
      <TouchableWithoutFeedback onPress={this.props.onPressWhitespace}>
        <View style={this.props.styles.sectionFooter}>
          <Button onPress={this.onSubmit} style={this.props.styles.addButton}>
            <View style={this.props.styles.addButtonContents}>
              <SWMansionIcon
                name="plus-circle"
                style={this.props.styles.addIcon}
              />
              <Text style={this.props.styles.actionLinksText}>Add</Text>
            </View>
          </Button>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  onSubmit = () => {
    this.props.onAdd(this.props.dateString);
  };
}

const unboundStyles = {
  actionLinksText: {
    color: 'listSeparatorLabel',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: 'panelSecondaryForeground',
    borderRadius: 5,
    margin: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
  },
  addButtonContents: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  addIcon: {
    color: 'listSeparatorLabel',
    fontSize: 18,
    paddingRight: 4,
  },
  sectionFooter: {
    alignItems: 'flex-start',
    backgroundColor: 'listBackground',
    height: 40,
  },
};

const ConnectedSectionFooter: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedSectionFooter(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const colors = useColors();

    return <SectionFooter {...props} styles={styles} colors={colors} />;
  });

export default ConnectedSectionFooter;
