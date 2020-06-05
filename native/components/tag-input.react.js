// @flow

import type { ViewStyle, TextStyle } from '../types/styles';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { AppState } from '../redux/redux-setup';
import type { LayoutEvent } from '../types/react-native';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ViewPropTypes,
  Platform,
} from 'react-native';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';

import { dimensionsSelector } from '../selectors/dimension-selectors';
import { type Colors, colorsPropType, colorsSelector } from '../themes/colors';

type Props<T> = {|
  /**
   * An array of tags, which can be any type, as long as labelExtractor below
   * can extract a string from it.
   */
  value: $ReadOnlyArray<T>,
  /**
   * A handler to be called when array of tags change.
   */
  onChange: (items: $ReadOnlyArray<T>) => void,
  /**
   * Function to extract string value for label from item
   */
  labelExtractor: (tagData: T) => string,
  /**
   * The text currently being displayed in the TextInput following the list of
   * tags.
   */
  text: string,
  /**
   * This callback gets called when the user in the TextInput. The caller should
   * update the text prop when this is called if they want to access input.
   */
  onChangeText: (text: string) => void,
  /**
   * If `true`, text and tags are not editable. The default value is `false`.
   */
  disabled?: boolean,
  /**
   * Background color of tags
   */
  tagColor?: string,
  /**
   * Text color of tags
   */
  tagTextColor?: string,
  /**
   * Styling override for container surrounding tag text
   */
  tagContainerStyle?: ViewStyle,
  /**
   * Styling override for tag's text component
   */
  tagTextStyle?: TextStyle,
  /**
   * Color of text input
   */
  inputColor?: string,
  /**
   * Any misc. TextInput props (autoFocus, placeholder, returnKeyType, etc.)
   */
  inputProps?: $PropertyType<TextInput, 'props'>,
  /**
   * Min height of the tag input on screen
   */
  minHeight: number,
  /**
   * Max height of the tag input on screen (will scroll if max height reached)
   */
  maxHeight: number,
  /**
   * Callback that gets passed the new component height when it changes
   */
  onHeightChange?: (height: number) => void,
  /**
   * inputWidth if text === "". we want this number explicitly because if we're
   * forced to measure the component, there can be a short jump between the old
   * value and the new value, which looks sketchy.
   */
  defaultInputWidth: number,
  innerRef?: (tagInput: ?TagInput<T>) => void,
  // Redux state
  dimensions: Dimensions,
  colors: Colors,
|};
type State = {|
  wrapperHeight: number,
  contentHeight: number,
  wrapperWidth: number,
  spaceLeft: number,
|};
class TagInput<T> extends React.PureComponent<Props<T>, State> {
  static propTypes = {
    value: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    labelExtractor: PropTypes.func.isRequired,
    text: PropTypes.string.isRequired,
    onChangeText: PropTypes.func.isRequired,
    tagColor: PropTypes.string,
    tagTextColor: PropTypes.string,
    tagContainerStyle: ViewPropTypes.style,
    tagTextStyle: Text.propTypes.style,
    inputColor: PropTypes.string,
    inputProps: PropTypes.shape(TextInput.propTypes),
    minHeight: PropTypes.number,
    maxHeight: PropTypes.number,
    onHeightChange: PropTypes.func,
    defaultInputWidth: PropTypes.number,
    innerRef: PropTypes.func,
    dimensions: dimensionsPropType.isRequired,
    colors: colorsPropType.isRequired,
  };
  // scroll to bottom
  scrollViewHeight = 0;
  scrollToBottomAfterNextScrollViewLayout = false;
  // refs
  tagInput: ?React.ElementRef<typeof TextInput> = null;
  scrollView: ?React.ElementRef<typeof ScrollView> = null;
  lastChange: ?{| time: number, prevText: string |};

  static defaultProps = {
    minHeight: 30,
    maxHeight: 75,
    defaultInputWidth: 90,
  };

  constructor(props: Props<T>) {
    super(props);
    this.state = {
      wrapperHeight: 30,
      // was wrapperHeight: 36,
      contentHeight: 0,
      wrapperWidth: props.dimensions.width,
      spaceLeft: 0,
    };
  }

  componentDidMount() {
    if (this.props.innerRef) {
      this.props.innerRef(this);
    }
  }

  componentWillUnmount() {
    if (this.props.innerRef) {
      this.props.innerRef(null);
    }
  }

  static getDerivedStateFromProps(props: Props<T>, state: State) {
    const wrapperHeight = Math.max(
      Math.min(props.maxHeight, state.contentHeight),
      props.minHeight,
    );
    return { wrapperHeight };
  }

  componentDidUpdate(prevProps: Props<T>, prevState: State) {
    if (
      this.props.onHeightChange &&
      this.state.wrapperHeight !== prevState.wrapperHeight
    ) {
      this.props.onHeightChange(this.state.wrapperHeight);
    }
  }

  measureWrapper = (event: LayoutEvent) => {
    const wrapperWidth = event.nativeEvent.layout.width;
    if (wrapperWidth !== this.state.wrapperWidth) {
      this.setState({ wrapperWidth });
    }
  };

  onChangeText = (text: string) => {
    this.lastChange = { time: Date.now(), prevText: this.props.text };
    this.props.onChangeText(text);
  };

  onBlur = (
    event: $ReadOnly<{ nativeEvent: $ReadOnly<{ target: number }> }>,
  ) => {
    invariant(Platform.OS === 'ios', 'only iOS gets text on TextInput.onBlur');
    const nativeEvent: $ReadOnly<{
      target: number,
      text: string,
    }> = (event.nativeEvent: any);
    this.onChangeText(nativeEvent.text);
  };

  onKeyPress = (
    event: $ReadOnly<{ nativeEvent: $ReadOnly<{ key: string }> }>,
  ) => {
    const { lastChange } = this;
    let { text } = this.props;
    if (
      Platform.OS === 'android' &&
      lastChange !== null &&
      lastChange !== undefined &&
      Date.now() - lastChange.time < 150
    ) {
      text = lastChange.prevText;
    }
    if (text !== '' || event.nativeEvent.key !== 'Backspace') {
      return;
    }
    const tags = [...this.props.value];
    tags.pop();
    this.props.onChange(tags);
    this.focus();
  };

  focus = () => {
    invariant(this.tagInput, 'should be set');
    this.tagInput.focus();
  };

  removeIndex = (index: number) => {
    const tags = [...this.props.value];
    tags.splice(index, 1);
    this.props.onChange(tags);
  };

  scrollToBottom = () => {
    const scrollView = this.scrollView;
    invariant(
      scrollView,
      'this.scrollView ref should exist before scrollToBottom called',
    );
    scrollView.scrollToEnd();
  };

  render() {
    const tagColor = this.props.tagColor || this.props.colors.modalSubtext;
    const tagTextColor =
      this.props.tagTextColor || this.props.colors.modalForegroundLabel;
    const inputColor =
      this.props.inputColor || this.props.colors.modalForegroundLabel;
    const placeholderColor = this.props.colors.modalForegroundTertiaryLabel;

    const tags = this.props.value.map((tag, index) => (
      <Tag
        index={index}
        disabled={this.props.disabled}
        label={this.props.labelExtractor(tag)}
        isLastTag={this.props.value.length === index + 1}
        onLayoutLastTag={this.onLayoutLastTag}
        removeIndex={this.removeIndex}
        tagColor={tagColor}
        tagTextColor={tagTextColor}
        tagContainerStyle={this.props.tagContainerStyle}
        tagTextStyle={this.props.tagTextStyle}
        key={index}
      />
    ));

    let inputWidth;
    if (this.props.text === '') {
      inputWidth = this.props.defaultInputWidth;
    } else if (this.state.spaceLeft >= 100) {
      inputWidth = this.state.spaceLeft - 10;
    } else {
      inputWidth = this.state.wrapperWidth;
    }

    const defaultTextInputProps: React.ElementProps<typeof TextInput> = {
      blurOnSubmit: false,
      style: [
        styles.textInput,
        {
          width: inputWidth,
          color: inputColor,
        },
      ],
      autoCapitalize: 'none',
      autoCorrect: false,
      placeholder: 'Start typing',
      placeholderTextColor: placeholderColor,
      returnKeyType: 'done',
      keyboardType: 'default',
      underlineColorAndroid: 'rgba(0,0,0,0)',
    };

    const textInputProps: React.ElementProps<typeof TextInput> = {
      ...defaultTextInputProps,
      ...this.props.inputProps,
      // should not be overridden
      onKeyPress: this.onKeyPress,
      value: this.props.text,
      onBlur: Platform.OS === 'ios' ? this.onBlur : undefined,
      onChangeText: this.onChangeText,
      editable: !this.props.disabled,
    };

    return (
      <TouchableWithoutFeedback
        onPress={this.focus}
        onLayout={this.measureWrapper}
      >
        <View style={[styles.wrapper, { height: this.state.wrapperHeight }]}>
          <ScrollView
            ref={this.scrollViewRef}
            style={styles.tagInputContainerScroll}
            onContentSizeChange={this.onScrollViewContentSizeChange}
            onLayout={this.onScrollViewLayout}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tagInputContainer}>
              {tags}
              <View style={[styles.textInputContainer, { width: inputWidth }]}>
                <TextInput ref={this.tagInputRef} {...textInputProps} />
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  tagInputRef = (tagInput: ?React.ElementRef<typeof TextInput>) => {
    this.tagInput = tagInput;
  };

  scrollViewRef = (scrollView: ?React.ElementRef<typeof ScrollView>) => {
    this.scrollView = scrollView;
  };

  onScrollViewContentSizeChange = (w: number, h: number) => {
    const oldContentHeight = this.state.contentHeight;
    if (h === oldContentHeight) {
      return;
    }

    let callback;
    if (h > oldContentHeight) {
      callback = () => {
        if (this.scrollViewHeight === this.props.maxHeight) {
          this.scrollToBottom();
        } else {
          this.scrollToBottomAfterNextScrollViewLayout = true;
        }
      };
    }

    this.setState({ contentHeight: h }, callback);
  };

  onScrollViewLayout = (event: LayoutEvent) => {
    this.scrollViewHeight = event.nativeEvent.layout.height;
    if (this.scrollToBottomAfterNextScrollViewLayout) {
      this.scrollToBottom();
      this.scrollToBottomAfterNextScrollViewLayout = false;
    }
  };

  onLayoutLastTag = (endPosOfTag: number) => {
    const margin = 3;
    const spaceLeft = this.state.wrapperWidth - endPosOfTag - margin - 10;
    if (spaceLeft !== this.state.spaceLeft) {
      this.setState({ spaceLeft });
    }
  };
}

type TagProps = {|
  index: number,
  label: string,
  isLastTag: boolean,
  onLayoutLastTag: (endPosOfTag: number) => void,
  removeIndex: (index: number) => void,
  tagColor: string,
  tagTextColor: string,
  tagContainerStyle?: ViewStyle,
  tagTextStyle?: TextStyle,
  disabled?: boolean,
|};
class Tag extends React.PureComponent<TagProps> {
  static propTypes = {
    index: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    isLastTag: PropTypes.bool.isRequired,
    onLayoutLastTag: PropTypes.func.isRequired,
    removeIndex: PropTypes.func.isRequired,
    tagColor: PropTypes.string.isRequired,
    tagTextColor: PropTypes.string.isRequired,
    tagContainerStyle: ViewPropTypes.style,
    tagTextStyle: Text.propTypes.style,
  };
  curPos: ?number = null;

  componentDidUpdate(prevProps: TagProps) {
    if (
      !prevProps.isLastTag &&
      this.props.isLastTag &&
      this.curPos !== null &&
      this.curPos !== undefined
    ) {
      this.props.onLayoutLastTag(this.curPos);
    }
  }

  render() {
    return (
      <TouchableOpacity
        onPress={this.onPress}
        onLayout={this.onLayoutLastTag}
        disabled={this.props.disabled}
        style={[
          styles.tag,
          { backgroundColor: this.props.tagColor },
          this.props.tagContainerStyle,
        ]}
      >
        <Text
          style={[
            styles.tagText,
            { color: this.props.tagTextColor },
            this.props.tagTextStyle,
          ]}
        >
          {this.props.label}
          &nbsp;&times;
        </Text>
      </TouchableOpacity>
    );
  }

  onPress = () => {
    this.props.removeIndex(this.props.index);
  };

  onLayoutLastTag = (event: LayoutEvent) => {
    const layout = event.nativeEvent.layout;
    this.curPos = layout.width + layout.x;
    if (this.props.isLastTag) {
      this.props.onLayoutLastTag(this.curPos);
    }
  };
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: 2,
    justifyContent: 'center',
    marginBottom: 3,
    marginRight: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagInputContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagInputContainerScroll: {
    flex: 1,
  },
  tagText: {
    fontSize: 16,
    margin: 0,
    padding: 0,
  },
  textInput: {
    flex: 0.6,
    fontSize: 16,
    height: 24,
    marginBottom: 3,
    marginHorizontal: 0,
    marginTop: 3,
    padding: 0,
  },
  textInputContainer: {},
  wrapper: {},
});

export default connect((state: AppState) => ({
  dimensions: dimensionsSelector(state),
  colors: colorsSelector(state),
}))(TagInput);
