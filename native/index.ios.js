// @flow

import React from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TabBarIOS,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import Calendar from './ios-components/calendar';

type Props = {
};
type State = {
  selectedTab: string,
};

class SquadCal extends React.Component {

  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedTab: 'calendar',
    };
  }

  render() {
    return (
      <TabBarIOS>
        <Icon.TabBarItemIOS
          title="Calendar"
          selected={this.state.selectedTab === 'calendar'}
          onPress={() => this.setState({ selectedTab: 'calendar' })}
          iconName="calendar"
        >
          <Calendar />
        </Icon.TabBarItemIOS>
        <Icon.TabBarItemIOS
          title="Chat"
          selected={this.state.selectedTab === 'chat'}
          onPress={() => this.setState({ selectedTab: 'chat' })}
          iconName="comments-o"
        >
          <View style={styles.container}>
            <Text style={styles.instructions}>
              Stay down
            </Text>
          </View>
        </Icon.TabBarItemIOS>
        <Icon.TabBarItemIOS
          title="More"
          selected={this.state.selectedTab === 'more'}
          onPress={() => this.setState({ selectedTab: 'more' })}
          iconName="bars"
        >
          <View style={styles.container}>
            <Text style={styles.instructions}>
              Press Cmd+R to reload,{'\n'}
              Cmd+D or shake for dev menu
            </Text>
          </View>
        </Icon.TabBarItemIOS>
      </TabBarIOS>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

AppRegistry.registerComponent('SquadCal', () => SquadCal);

export default SquadCal;
