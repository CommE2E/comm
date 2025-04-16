#import <Expo/Expo.h>
#import <UIKit/UIKit.h>
#import <RCTAppDelegate.h>

@interface AppDelegate
    : EXAppDelegateWrapper <UIApplicationDelegate>

@property(nonatomic, strong) UIWindow *window;

@end
