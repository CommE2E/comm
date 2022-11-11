package app.comm.android;

import android.content.Context;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactContext;
import expo.modules.adapters.react.services.UIManagerModuleWrapper;
import expo.modules.core.ModuleRegistry;
import expo.modules.core.interfaces.InternalModule;
import expo.modules.securestore.SecureStoreModule;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Supplier;

public class ExpoUtils {
  public static Supplier<SecureStoreModule>
  createExpoSecureStoreSupplier(@NonNull Context context) {
    return () -> {
      List<InternalModule> expoInternalModules = new ArrayList<>(1);
      if (context instanceof ReactContext) {
        // We can only provide the UIManager module if provided context is a
        // React context. If this is called from non-react activity, like
        // CommNotificationsHandler, we skip adding this module. This is fine,
        // unless we use the `requiresAuthentication` option when dealing with
        // expo-secure-store (at this moment we don't use it anywhere)
        expoInternalModules.add(
            new UIManagerModuleWrapper((ReactContext)context));
      }

      ModuleRegistry expoModuleRegistry = new ModuleRegistry(
          expoInternalModules,
          Collections.emptyList(),
          Collections.emptyList(),
          Collections.emptyList());
      SecureStoreModule secureStoreModule = new SecureStoreModule(context);
      secureStoreModule.onCreate(expoModuleRegistry);
      return secureStoreModule;
    };
  }
}
