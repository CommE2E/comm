#import <UIKit/UIKit.h>
#import <React/RCTBackedTextInputViewProtocol.h>

NS_ASSUME_NONNULL_BEGIN

/*
 * Just regular UITextView... but much better!
 */
@interface CustomUITextView : UITextView <RCTBackedTextInputViewProtocol>

- (instancetype)initWithFrame:(CGRect)frame textContainer:(nullable NSTextContainer *)textContainer NS_UNAVAILABLE;
- (instancetype)initWithCoder:(NSCoder *)decoder NS_UNAVAILABLE;

@property (nonatomic, weak) id<RCTBackedTextInputDelegate> textInputDelegate;

@property (nonatomic, assign) BOOL contextMenuHidden;
@property (nonatomic, assign, readonly) BOOL textWasPasted;
@property (nonatomic, assign, readonly) BOOL dictationRecognizing;
@property (nonatomic, copy, nullable) NSString *placeholder;
@property (nonatomic, strong, nullable) UIColor *placeholderColor;

@property (nonatomic, assign) CGFloat preferredMaxLayoutWidth;

// The `clearButtonMode` property actually is not supported yet;
// it's declared here only to conform to the interface.
@property (nonatomic, assign) UITextFieldViewMode clearButtonMode;

@property (nonatomic, assign) BOOL caretHidden;

@property (nonatomic, strong, nullable) NSString *inputAccessoryViewID;
@property (nonatomic, strong, nullable) NSString *inputAccessoryViewButtonLabel;

@property (nonatomic, assign) BOOL disableKeyboardShortcuts;

@end

NS_ASSUME_NONNULL_END
