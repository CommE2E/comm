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

    // We issue a useless set on CommSecureStore here to force it to initialize
    // prior to scheduling initializeDatabaseManager on the DB thread below.
    // This avoids a race condition where the DB thread and main thread both
    // attempt to initialize CommSecureStore at the same time, which can cause
    // a crash loop as described in ENG-7696 and ENG-8069.
    CommSecureStore.set("comm.secure_store_initialization_complete", "1");

    File sqliteFile = reactApplicationContext.getDatabasePath("comm.sqlite");
    GlobalDBSingleton.scheduleOrRun(() -> {
      DatabaseInitializer.initializeDatabaseManager(sqliteFile.getPath());
    });
    CommMMKV.initialize();

    return Collections.emptyList();
  }
}
