#import "CommCoreJSInitializerModule.h"
#import "CommConstants.h"
#import "CommCoreModule.h"
#import "CommRustModule.h"
#import "CommUtilsModule.h"
#import <ReactCommon/RCTTurboModule.h>

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation CommCoreJSInitializerModule

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(CommCoreJSInitializerModule);


+ (BOOL)requiresMainQueueSetup
{
  // We do want to run the initialization (`setBridge`) on the JS thread.
  return NO;
}

- (void)setBridge:(RCTBridge *)bridge
{
  // As of React Native 0.74 with the New Architecture enabled,
  // it's actually an instance of `RCTBridgeProxy` that provides backwards compatibility.
  // Also, hold on with initializing the runtime until `setRuntimeExecutor` is called.
  _bridge = bridge;
}

/**
 A synchronous method that is called from JS before requiring
 any module to ensure that all necessary bindings are installed.
 */
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
    RCTBridge* bridge = self.bridge;
    facebook::jsi::Runtime &rt = *reinterpret_cast<facebook::jsi::Runtime *>(bridge.runtime);
  
    auto jsCallInvoker = bridge.jsCallInvoker;
  
    std::shared_ptr<comm::CommCoreModule> coreNativeModule =
    std::make_shared<comm::CommCoreModule>(jsCallInvoker);
    std::shared_ptr<comm::CommUtilsModule> utilsNativeModule =
    std::make_shared<comm::CommUtilsModule>(jsCallInvoker);
    std::shared_ptr<comm::CommRustModule> rustNativeModule =
    std::make_shared<comm::CommRustModule>(jsCallInvoker);
    std::shared_ptr<comm::CommConstants> nativeConstants =
    std::make_shared<comm::CommConstants>();
  
    rt.global().setProperty(
                            rt,
                            facebook::jsi::PropNameID::forAscii(rt, "CommCoreModule"),
                            facebook::jsi::Object::createFromHostObject(rt, coreNativeModule));
    rt.global().setProperty(
                            rt,
                            facebook::jsi::PropNameID::forAscii(rt, "CommUtilsModule"),
                            facebook::jsi::Object::createFromHostObject(rt, utilsNativeModule));
    rt.global().setProperty(
                            rt,
                            facebook::jsi::PropNameID::forAscii(rt, "CommRustModule"),
                            facebook::jsi::Object::createFromHostObject(rt, rustNativeModule));
    rt.global().setProperty(
                            rt,
                            facebook::jsi::PropNameID::forAscii(rt, "CommConstants"),
                            facebook::jsi::Object::createFromHostObject(rt, nativeConstants));
  return nil;
}

@end
