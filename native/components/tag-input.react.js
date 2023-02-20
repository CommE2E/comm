// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  Text,
  TextInput as BaseTextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';

import type { Shape } from 'lib/types/core.js';

import TextInput from './text-input.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, type Colors } from '../themes/colors.js';
import type {
  LayoutEvent,
  KeyPressEvent,
  BlurEvent,
} from '../types/react-native.js';
import type { ViewStyle, TextStyle } from '../types/styles.js';

type DefaultProps = {
  /**
   * Min height of the tag input on screen
   */
  +minHeight: number,
  /**
   * Max height of the tag input on screen (will scroll if max height reached)
   */
  +maxHeight: number,
  /**
   * inputWidth if text === "". we want this number explicitly because if we're
   * forced to measure the component, there can be a short jump between the old
   * value and the new value, which looks sketchy.
   */
  +defaultInputWidth: number,
};
type TagInputProps<T> = {
  ...DefaultProps,
  /**
   * An array of tags, which can be any type, as long as labelExtractor below
   * can extract a string from it.
   */
  +value: $ReadOnlyArray<T>,
  /**
   * A handler to be called when array of tags change.
   */
  +onChange: (items: $ReadOnlyArray<T>) => void,
  /**
   * Function to extract string value for label from item
   */
  +labelExtractor: (tagData: T) => string,
  /**
   * The text currently being displayed in the TextInput following the list of
   * tags.
   */
  +text: string,
  /**
   * This callback gets called when the user in the TextInput. The caller should
   * update the text prop when this is called if they want to access input.
   */
  +onChangeText: (text: string) => mixed,
  /**
   * If `true`, text and tags are not editable. The default value is `false`.
   */
  +disabled?: boolean,
  /**
   * Background color of tags
   */
  +tagColor?: string,
  /**
   * Text color of tags
   */
  +tagTextColor?: string,
  /**
   * Styling override for container surrounding tag text
   */
  +tagContainerStyle?: ViewStyle,
  /**
   * Styling override for tag's text component
   */
  +tagTextStyle?: TextStyle,
  /**
   * Color of text input
   */
  +inputColor?: string,
  /**
   * Any misc. TextInput props (autoFocus, placeholder, returnKeyType, etc.)
   */
  +inputProps?: React.ElementConfig<typeof BaseTextInput>,
  /**
   * Callback that gets passed the new component height when it changes
   */
  +onHeightChange?: (height: number) => void,
};
type BaseTagInputProps<T> = {
  ...TagInputProps<T>,
  +windowWidth: number,
  +colors: Colors,
};
type State = {
  +wrapperHeight: number,
  +contentHeight: number,
  +wrapperWidth: number,
  +spaceLeft: number,
};
class BaseTagInput<T> extends React.PureComponent<BaseTagInputProps<T>, State> {
  // scroll to bottom
  scrollViewHeight: number = 0;
  scrollToBottomAfterNextScrollViewLayout: boolean = false;
  // refs
  tagInput: ?React.ElementRef<typeof BaseTextInput> = null;
  scrollView: ?React.ElementRef<typeof ScrollView> = null;
  lastChange: ?{ time: number, prevText: string };

  static defaultProps: DefaultProps = {
    minHeight: 30,
    maxHeight: 75,
    defaultInputWidth: 90,
  };

  constructor(props: BaseTagInputProps<T>) {
    super(props);
    this.state = {
      wrapperHeight: 30,
      // was wrapperHeight: 36,
      contentHeight: 0,
      wrapperWidth: props.windowWidth,
      spaceLeft: 0,
    };
  }

  static getDerivedStateFromProps(
    props: BaseTagInputProps<T>,
    state: State,
  ): Shape<State> {
    const wrapperHeight = Math.max(
      Math.min(props.maxHeight, state.contentHeight),
      props.minHeight,
    );
    return { wrapperHeight };
  }

  componentDidUpdate(prevProps: BaseTagInputProps<T>, prevState: State) {
    if (
      this.props.onHeightChange &&
      this.state.wrapperHeight !== prevState.wrapperHeight
    ) {
      this.props.onHeightChange(this.state.wrapperHeight);
    }
  }

  measureWrapper: (event: LayoutEvent) => void = event => {
    const wrapperWidth = event.nativeEvent.layout.width;
    if (wrapperWidth !== this.state.wrapperWidth) {
      this.setState({ wrapperWidth });
    }
  };

  onChangeText: (text: string) => void = text => {
    this.lastChange = { time: Date.now(), prevText: this.props.text };
    this.props.onChangeText(text);
  };

  onBlur: (event: BlurEvent) => void = event => {
    invariant(Platform.OS === 'ios', 'only iOS gets text on TextInput.onBlur');
    const nativeEvent: $ReadOnly<{
      target: number,
      text: string,
    }> = (event.nativeEvent: any);
    this.onChangeText(nativeEvent.text);
  };

  onKeyPress: (event: KeyPressEvent) => void = event => {
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

  focus: () => void = () => {
    invariant(this.tagInput, 'should be set');
    this.tagInput.focus();
  };

  removeIndex: (index: number) => void = index => {
    const tags = [...this.props.value];
    tags.splice(index, 1);
    this.props.onChange(tags);
  };

  scrollToBottom: () => void = () => {
    const scrollView = this.scrollView;
    invariant(
      scrollView,
      'this.scrollView ref should exist before scrollToBottom called',
    );
    scrollView.scrollToEnd();
  };

  render(): React.Node {
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

    const defaultTextInputProps: React.ElementConfig<typeof BaseTextInput> = {
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
    };

    const textInputProps: React.ElementConfig<typeof BaseTextInput> = {
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

  tagInputRef: (tagInput: ?React.ElementRef<typeof BaseTextInput>) => void =
    tagInput => {
      this.tagInput = tagInput;
    };

  scrollViewRef: (scrollView: ?React.ElementRef<typeof ScrollView>) => void =
    scrollView => {
      this.scrollView = scrollView;
    };

  onScrollViewContentSizeChange: (w: number, h: number) => void = (w, h) => {
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

  onScrollViewLayout: (event: LayoutEvent) => void = event => {
    this.scrollViewHeight = event.nativeEvent.layout.height;
    if (this.scrollToBottomAfterNextScrollViewLayout) {
      this.scrollToBottom();
      this.scrollToBottomAfterNextScrollViewLayout = false;
    }
  };

  onLayoutLastTag: (endPosOfTag: number) => void = endPosOfTag => {
    const margin = 3;
    const spaceLeft = this.state.wrapperWidth - endPosOfTag - margin - 10;
    if (spaceLeft !== this.state.spaceLeft) {
      this.setState({ spaceLeft });
    }
  };
}

type TagProps = {
  +index: number,
  +label: string,
  +isLastTag: boolean,
  +onLayoutLastTag: (endPosOfTag: number) => void,
  +removeIndex: (index: number) => void,
  +tagColor: string,
  +tagTextColor: string,
  +tagContainerStyle?: ViewStyle,
  +tagTextStyle?: TextStyle,
  +disabled?: boolean,
};
class Tag extends React.PureComponent<TagProps> {
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
    borderBottomColor: 'transparent',
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

type BaseConfig<T> = React.Config<
  TagInputProps<T>,
  typeof BaseTagInput.defaultProps,
>;

function createTagInput<T>(): React.AbstractComponent<
  BaseConfig<T>,
  BaseTagInput<T>,
> {
  return React.forwardRef<BaseConfig<T>, BaseTagInput<T>>(
    function ForwardedTagInput(
      props: BaseConfig<T>,
      ref: React.Ref<typeof BaseTagInput>,
    ) {
      const windowWidth = useSelector(state => state.dimensions.width);
      const colors = useColors();
      return (
        <BaseTagInput
          {...props}
          windowWidth={windowWidth}
          colors={colors}
          ref={ref}
        />
      );
    },
  );
}

export { createTagInput, BaseTagInput };
