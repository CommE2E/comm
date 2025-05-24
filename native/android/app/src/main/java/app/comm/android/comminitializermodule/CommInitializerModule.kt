package app.comm.android.comminitializermodule

import app.comm.android.fbjni.CommHybrid
import app.comm.android.fbjni.CommMMKV
import app.comm.android.fbjni.CommSecureStore
import app.comm.android.fbjni.DatabaseInitializer
import app.comm.android.fbjni.GlobalDBSingleton
import app.comm.android.securestore.SecureStoreModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = CommInitializerModuleSpec.NAME)
class CommInitializerModule(reactContext: ReactApplicationContext?) :
  CommInitializerModuleSpec(reactContext) {
  @ReactMethod(isBlockingSynchronousMethod = true)
  override fun initializeComm(): Boolean {
    CommSecureStore.getInstance().initialize({
      SecureStoreModule(reactApplicationContext)
    })
    CommHybrid.initHybrid(reactApplicationContext)

    // We issue a useless set on CommSecureStore here to force it to initialize
    // prior to scheduling initializeDatabaseManager on the DB thread below.
    // This avoids a race condition where the DB thread and main thread both
    // attempt to initialize CommSecureStore at the same time, which can cause
    // a crash loop as described in ENG-7696 and ENG-8069.
    CommSecureStore.set("comm.secure_store_initialization_complete", "1")

    val sqliteFile = reactApplicationContext.getDatabasePath("comm.sqlite")
    GlobalDBSingleton.scheduleOrRun {
      DatabaseInitializer.initializeDatabaseManager(sqliteFile.path)
    }
    CommMMKV.initialize()

    return true
  }
}