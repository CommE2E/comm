// @flow

import type { ViewStyle, TextStyle } from '../types/styles';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { AppState } from '../redux-setup';

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

type Props<T> = {
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
   * Background color of tags
   */
  tagColor: string,
  /**
   * Text color of tags
   */
  tagTextColor: string,
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
  inputColor: string,
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
};
type State = {
  inputWidth: number,
  wrapperHeight: number,
};
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
  };
  wrapperWidth: number;
  spaceLeft = 0;
  // scroll to bottom
  contentHeight = 0;
  scrollViewHeight = 0;
  scrollToBottomAfterNextScrollViewLayout = false;
  // refs
  tagInput: ?React.ElementRef<typeof TextInput> = null;
  scrollView: ?React.ElementRef<typeof ScrollView> = null;

  static defaultProps = {
    tagColor: '#dddddd',
    tagTextColor: '#777777',
    inputColor: '#777777',
    minHeight: 27,
    maxHeight: 75,
    defaultInputWidth: 90,
  };

  static inputWidth(
    text: string,
    spaceLeft: number,
    wrapperWidth: number,
    defaultInputWidth: number,
  ) {
    if (text === "") {
      return defaultInputWidth;
    } else if (spaceLeft >= 100) {
      return spaceLeft - 10;
    } else {
      return wrapperWidth;
    }
  }

  constructor(props: Props<T>) {
    super(props);
    this.state = {
      inputWidth: props.defaultInputWidth,
      wrapperHeight: 36,
    };
    this.wrapperWidth = props.dimensions.width;
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

  componentWillReceiveProps(nextProps: Props<T>) {
    const inputWidth = TagInput.inputWidth(
      nextProps.text,
      this.spaceLeft,
      this.wrapperWidth,
      nextProps.defaultInputWidth,
    );
    if (inputWidth !== this.state.inputWidth) {
      this.setState({ inputWidth });
    }
    const wrapperHeight = Math.max(
      Math.min(
        nextProps.maxHeight,
        this.contentHeight,
      ),
      nextProps.minHeight,
    );
    if (wrapperHeight !== this.state.wrapperHeight) {
      this.setState({ wrapperHeight });
    }
  }

  componentWillUpdate(nextProps: Props<T>, nextState: State) {
    if (
      this.props.onHeightChange &&
      nextState.wrapperHeight !== this.state.wrapperHeight
    ) {
      this.props.onHeightChange(nextState.wrapperHeight);
    }
  }

  measureWrapper = (event: { nativeEvent: { layout: { width: number } } }) => {
    this.wrapperWidth = event.nativeEvent.layout.width;
    const inputWidth = TagInput.inputWidth(
      this.props.text,
      this.spaceLeft,
      this.wrapperWidth,
      this.props.defaultInputWidth,
    );
    if (inputWidth !== this.state.inputWidth) {
      this.setState({ inputWidth });
    }
  }

  onBlur = (event: { nativeEvent: { text: string } }) => {
    invariant(Platform.OS === "ios", "only iOS gets text on TextInput.onBlur");
    this.props.onChangeText(event.nativeEvent.text);
  }

  onKeyPress = (event: { nativeEvent: { key: string } }) => {
    if (this.props.text !== '' || event.nativeEvent.key !== 'Backspace') {
      return;
    }
    const tags = [...this.props.value];
    tags.pop();
    this.props.onChange(tags);
    this.focus();
  }

  focus = () => {
    invariant(this.tagInput, "should be set");
    this.tagInput.focus();
  }

  removeIndex = (index: number) => {
    const tags = [...this.props.value];
    tags.splice(index, 1);
    this.props.onChange(tags);
  }

  scrollToBottom = () => {
    const scrollView = this.scrollView;
    invariant(
      scrollView,
      "this.scrollView ref should exist before scrollToBottom called",
    );
    scrollView.scrollToEnd();
  }

  render() {
    const tags = this.props.value.map((tag, index) => (
      <Tag
        index={index}
        label={this.props.labelExtractor(tag)}
        isLastTag={this.props.value.length === index + 1}
        onLayoutLastTag={this.onLayoutLastTag}
        removeIndex={this.removeIndex}
        tagColor={this.props.tagColor}
        tagTextColor={this.props.tagTextColor}
        tagContainerStyle={this.props.tagContainerStyle}
        tagTextStyle={this.props.tagTextStyle}
        key={index}
      />
    ));

    return (
      <TouchableWithoutFeedback
        onPress={this.focus}
        style={styles.container}
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
              <View style={[
                styles.textInputContainer,
                { width: this.state.inputWidth },
              ]}>
                <TextInput
                  ref={this.tagInputRef}
                  blurOnSubmit={false}
                  onKeyPress={this.onKeyPress}
                  value={this.props.text}
                  style={[styles.textInput, {
                    width: this.state.inputWidth,
                    color: this.props.inputColor,
                  }]}
                  onBlur={Platform.OS === "ios" ? this.onBlur : undefined}
                  onChangeText={this.props.onChangeText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Start typing"
                  returnKeyType="done"
                  keyboardType="default"
                  underlineColorAndroid="rgba(0,0,0,0)"
                  {...this.props.inputProps}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    )
  }

  tagInputRef = (tagInput: ?React.ElementRef<typeof TextInput>) => {
    this.tagInput = tagInput;
  }

  scrollViewRef = (scrollView: ?React.ElementRef<typeof ScrollView>) => {
    this.scrollView = scrollView;
  }

  onScrollViewContentSizeChange = (w: number, h: number) => {
    const oldContentHeight = this.contentHeight;
    if (oldContentHeight === h) {
      return;
    }
    this.contentHeight = h;
    const nextWrapperHeight = Math.max(
      Math.min(this.props.maxHeight, h),
      this.props.minHeight,
    );
    if (nextWrapperHeight !== this.state.wrapperHeight) {
      this.setState({ wrapperHeight: nextWrapperHeight });
    }
    if (oldContentHeight < h) {
      if (this.scrollViewHeight === this.props.maxHeight) {
        this.scrollToBottom();
      } else {
        this.scrollToBottomAfterNextScrollViewLayout = true;
      }
    }
  }

  onScrollViewLayout = (
    event: { nativeEvent: { layout: { height: number } } },
  ) => {
    this.scrollViewHeight = event.nativeEvent.layout.height;
    if (this.scrollToBottomAfterNextScrollViewLayout) {
      this.scrollToBottom();
      this.scrollToBottomAfterNextScrollViewLayout = false;
    }
  }

  onLayoutLastTag = (endPosOfTag: number) => {
    const margin = 3;
    this.spaceLeft = this.wrapperWidth - endPosOfTag - margin - 10;
    const inputWidth = TagInput.inputWidth(
      this.props.text,
      this.spaceLeft,
      this.wrapperWidth,
      this.props.defaultInputWidth,
    );
    if (inputWidth !== this.state.inputWidth) {
      this.setState({ inputWidth });
    }
  }

}

type TagProps = {
  index: number,
  label: string,
  isLastTag: bool,
  onLayoutLastTag: (endPosOfTag: number) => void,
  removeIndex: (index: number) => void,
  tagColor: string,
  tagTextColor: string,
  tagContainerStyle?: ViewStyle,
  tagTextStyle?: TextStyle,
};
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

  componentWillReceiveProps(nextProps: TagProps) {
    if (
      !this.props.isLastTag &&
      nextProps.isLastTag &&
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
        style={[
          styles.tag,
          { backgroundColor: this.props.tagColor },
          this.props.tagContainerStyle,
        ]}
      >
        <Text style={[
          styles.tagText,
          { color: this.props.tagTextColor },
          this.props.tagTextStyle,
        ]}>
          {this.props.label}
          &nbsp;&times;
        </Text>
      </TouchableOpacity>
    );
  }

  onPress = () => {
    this.props.removeIndex(this.props.index);
  }

  onLayoutLastTag = (
    event: { nativeEvent: { layout: { x: number, width: number } } },
  ) => {
    const layout = event.nativeEvent.layout;
    this.curPos = layout.width + layout.x;
    if (this.props.isLastTag) {
      this.props.onLayoutLastTag(this.curPos);
    }
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
  },
  tagInputContainerScroll: {
    flex: 1,
  },
  tagInputContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  textInput: {
    fontSize: 18,
    height: 24,
    flex: .6,
    padding: 0,
    marginTop: 3,
    marginBottom: 3,
    marginHorizontal: 0,
  },
  textInputContainer: {
  },
  tag: {
    justifyContent: 'center',
    marginTop: 3,
    marginRight: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  tagText: {
    padding: 0,
    margin: 0,
    fontSize: 16,
  },
});

export default connect(
  (state: AppState) => ({
    dimensions: dimensionsSelector(state),
  }),
)(TagInput);
