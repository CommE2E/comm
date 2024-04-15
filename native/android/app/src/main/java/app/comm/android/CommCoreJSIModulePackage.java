package app.comm.android;

import app.comm.android.fbjni.CommHybrid;
import app.comm.android.fbjni.CommMMKV;
import app.comm.android.fbjni.CommSecureStore;
import app.comm.android.fbjni.DatabaseInitializer;
import app.comm.android.fbjni.GlobalDBSingleton;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import expo.modules.securestore.SecureStoreModule;
import java.io.File;
import java.util.Collections;
import java.util.List;
import java.util.function.Supplier;

public class CommCoreJSIModulePackage implements JSIModulePackage {

  @Override
  public List<JSIModuleSpec> getJSIModules(
      ReactApplicationContext reactApplicationContext,
      JavaScriptContextHolder jsContext) {
    Supplier<SecureStoreModule> secureStoreModuleSupplier =
        ExpoUtils.createExpoSecureStoreSupplier(reactApplicationContext);
    CommSecureStore.getInstance().initialize(secureStoreModuleSupplier);
    CommHybrid.initHybrid(reactApplicationContext);

    File sqliteFile = reactApplicationContext.getDatabasePath("comm.sqlite");
    GlobalDBSingleton.scheduleOrRun(() -> {
      DatabaseInitializer.initializeDatabaseManager(sqliteFile.getPath());
    });
    CommMMKV.initialize();

    return Collections.emptyList();
  }
}
