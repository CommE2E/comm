package app.comm.android.fbjni;

import android.content.Context;
import app.comm.android.fbjni.CommMMKV;
import app.comm.android.fbjni.DatabaseInitializer;
import app.comm.android.fbjni.GlobalDBSingleton;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import java.io.File;
import java.util.HashMap;

public class CommHybrid {

  private CommHybrid() {
  }

  public static void initHybrid(ReactContext context) {
    CallInvokerHolderImpl holder =
        (CallInvokerHolderImpl)context.getCatalystInstance()
            .getJSCallInvokerHolder();
    long contextPointer = context.getJavaScriptContextHolder().get();

    // additional parameters
    File sqliteFile = context.getDatabasePath("comm.sqlite");
    String sqliteFilePath = sqliteFile.toString();
    HashMap<String, Object> additionalParameters =
        new HashMap<String, Object>();
    additionalParameters.put("sqliteFilePath", sqliteFilePath);

    new CommHybrid().initHybrid(contextPointer, holder, additionalParameters);

    GlobalDBSingleton.scheduleOrRun(() -> {
      DatabaseInitializer.initializeDatabaseManager(sqliteFile.getPath());
    });
    CommMMKV.initialize();
  }

  public native void initHybrid(
      long jsContextNativePointer,
      CallInvokerHolderImpl jsCallInvokerHolder,
      HashMap<String, Object> additionalParameters);
}
