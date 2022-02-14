package app.comm.android;

import android.util.Log;
import app.comm.android.fbjni.CommHybrid;
import app.comm.android.fbjni.CommSecureStore;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import com.swmansion.reanimated.ReanimatedJSIModulePackage;
import expo.modules.adapters.react.NativeModulesProxy;
import expo.modules.core.ModuleRegistry;
import expo.modules.securestore.SecureStoreModule;
import java.lang.reflect.Field;
import java.util.Collections;
import java.util.List;

public class CommCoreJSIModulePackage extends ReanimatedJSIModulePackage {

  @Override
  public List<JSIModuleSpec> getJSIModules(
      ReactApplicationContext reactApplicationContext,
      JavaScriptContextHolder jsContext) {
    ModuleRegistry moduleRegistry;
    try {
      Field moduleRegistryField =
          NativeModulesProxy.class.getDeclaredField("mModuleRegistry");
      moduleRegistryField.setAccessible(true);
      NativeModulesProxy proxy =
          (NativeModulesProxy)reactApplicationContext.getCatalystInstance()
              .getNativeModule("NativeUnimoduleProxy");
      moduleRegistry = (ModuleRegistry)moduleRegistryField.get(proxy);
    } catch (Exception e) {
      throw new RuntimeException(
          "Accessing expo modules registry resulted in an error: " +
          Log.getStackTraceString(e) +
          "This might be due to changes in expo's internal implementation.");
    }
    SecureStoreModule secureStoreModule =
        (SecureStoreModule)moduleRegistry.getExportedModuleOfClass(
            SecureStoreModule.class);
    CommSecureStore.getInstance().initialize(secureStoreModule);
    CommHybrid.initHybrid(reactApplicationContext);
    super.getJSIModules(reactApplicationContext, jsContext);
    return Collections.emptyList();
  }
}
