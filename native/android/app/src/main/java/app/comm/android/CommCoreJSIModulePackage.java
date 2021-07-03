package app.comm.android;

import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import java.util.Collections;
import java.util.List;
import app.comm.android.fbjni.CommHybrid;

public class CommCoreJSIModulePackage implements JSIModulePackage {
  @Override
  public List<JSIModuleSpec> getJSIModules(
    ReactApplicationContext reactApplicationContext,
    JavaScriptContextHolder jsContext
  ) {
    CommHybrid.initHybrid(reactApplicationContext);
    return Collections.emptyList();
  }
}
