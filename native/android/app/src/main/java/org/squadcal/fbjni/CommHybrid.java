package org.squadcal.fbjni;

import com.facebook.react.bridge.ReactContext;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;

public class CommHybrid {
  // prevent creating an object of this class
  private CommHybrid() {}

  public static void initHybrid(ReactContext context) {
    CallInvokerHolderImpl holder = (CallInvokerHolderImpl)
      context.getCatalystInstance().getJSCallInvokerHolder();
    long contextPointer = context.getJavaScriptContextHolder().get();
    initHybrid(contextPointer, holder);
  }
  public static native void initHybrid(
    long jsContextNativePointer,
    CallInvokerHolderImpl jsCallInvokerHolder
  );
}
