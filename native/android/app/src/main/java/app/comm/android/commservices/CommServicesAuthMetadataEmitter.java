package app.comm.android.commservices;

import android.util.Log;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.util.HashMap;
import java.util.Map;

public class CommServicesAuthMetadataEmitter
    extends ReactContextBaseJavaModule {

  private static int listenersCount = 0;
  private static CommServicesAuthMetadataEmitter sharedInstance = null;

  public static final String COMM_SERVICES_AUTH_METADATA =
      "commServicesAuthMetadata";

  CommServicesAuthMetadataEmitter(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "CommServicesAuthMetadataEmitter";
  }

  @ReactMethod
  public void addListener(String eventName) {
    synchronized (CommServicesAuthMetadataEmitter.class) {
      listenersCount++;
      if (sharedInstance == null) {
        sharedInstance = this;
      }
    }
  }

  @ReactMethod
  public void removeListeners(Integer count) {
    synchronized (CommServicesAuthMetadataEmitter.class) {
      listenersCount -= count;
      boolean isLastListener = listenersCount == 0;
      if (isLastListener) {
        sharedInstance = null;
      }
    }
  }

  public static void sendAuthMetadataToJS(String accessToken, String userID) {
    synchronized (CommServicesAuthMetadataEmitter.class) {
      if (sharedInstance == null) {
        return;
      }

      // Event body must match UserLoginResponse
      // type from 'lib/types/identity-service-types.js'
      WritableMap eventBody = Arguments.createMap();
      eventBody.putString("accessToken", accessToken);
      eventBody.putString("userID", userID);

      sharedInstance.getReactApplicationContext()
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
          .emit(COMM_SERVICES_AUTH_METADATA, eventBody);
    }
  }

  @Override
  public Map<String, Object> getConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put("COMM_SERVICES_AUTH_METADATA", COMM_SERVICES_AUTH_METADATA);
    return constants;
  }
}
