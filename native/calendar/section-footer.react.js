// @flow

import * as React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import Button from '../components/button.react';
import { type Colors, useStyles, useColors } from '../themes/colors';

type BaseProps = {|
  +dateString: string,
  +onAdd: (dateString: string) => void,
  +onPressWhitespace: () => void,
|};
type Props = {|
  ...BaseProps,
  +colors: Colors,
  +styles: typeof unboundStyles,
|};
class SectionFooter extends React.PureComponent<Props> {
  render() {
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;
    return (
      <TouchableWithoutFeedback onPress={this.props.onPressWhitespace}>
        <View style={this.props.styles.sectionFooter}>
          <Button
            onPress={this.onSubmit}
            iosFormat="highlight"
            iosHighlightUnderlayColor={underlayColor}
            iosActiveOpacity={0.85}
            style={this.props.styles.addButton}
          >
            <View style={this.props.styles.addButtonContents}>
              <Icon name="plus" style={this.props.styles.addIcon} />
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
    backgroundColor: 'listSeparator',
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
    fontSize: 14,
    paddingRight: 6,
  },
  sectionFooter: {
    alignItems: 'flex-start',
    backgroundColor: 'listBackground',
    height: 40,
  },
};

export default React.memo<BaseProps>(function ConnectedSectionFooter(
  props: BaseProps,
) {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  return <SectionFooter {...props} styles={styles} colors={colors} />;
});
