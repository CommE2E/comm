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
import java.util.function.Supplier;

public class CommCoreJSIModulePackage extends ReanimatedJSIModulePackage {

  @Override
  public List<JSIModuleSpec> getJSIModules(
      ReactApplicationContext reactApplicationContext,
      JavaScriptContextHolder jsContext) {
    Supplier<SecureStoreModule> secureStoreModuleSupplier =
        () -> new SecureStoreModule(reactApplicationContext);
    CommSecureStore.getInstance().initialize(secureStoreModuleSupplier);
    CommHybrid.initHybrid(reactApplicationContext);
    super.getJSIModules(reactApplicationContext, jsContext);
    return Collections.emptyList();
  }
}
