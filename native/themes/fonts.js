// @flow

import EntypoIcon from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcon from '@expo/vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';

import SWMansionIcons from '../fonts/SWMansionIcons.ttf';
import CommIcons from '../fonts/CommIcons.ttf';

function useLoadCommFonts(): boolean {
  const [fontsLoaded] = useFonts({
    ...EntypoIcon.font,
    ...Feather.font,
    ...FontAwesome.font,
    ...FontAwesome5.font,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcon.font,
    SWMansionIcons,
    CommIcons,
  });
  // In production we bundle the fonts directly, so we don't need to wait
  if (!__DEV__) {
    return true;
  }
  return fontsLoaded;
}

export { useLoadCommFonts };
