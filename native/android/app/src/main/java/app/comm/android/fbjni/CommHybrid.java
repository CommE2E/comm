package app.comm.android.fbjni;

import android.content.Context;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import java.util.HashMap;

public class CommHybrid {

  private CommHybrid() {
  }

  public static void initHybrid(ReactContext context) {
    CallInvokerHolderImpl holder =
        (CallInvokerHolderImpl)context.getCatalystInstance()
            .getJSCallInvokerHolder();
    long contextPointer = context.getJavaScriptContextHolder().get();
    new CommHybrid().initHybrid(contextPointer, holder);
  }

  public native void initHybrid(
      long jsContextNativePointer,
      CallInvokerHolderImpl jsCallInvokerHolder);
}
