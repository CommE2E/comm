package app.comm.android.fbjni;

import app.comm.android.commservices.CommAndroidServicesClient;
import java.io.IOException;
import org.json.JSONException;
import org.json.JSONObject;

public class NotificationsInboundKeysProvider {
  public static String getNotifsInboundKeysForDeviceID(String deviceID)
      throws IOException, JSONException {
    JSONObject notifInboundKeys =
        CommAndroidServicesClient.getInstance()
            .getNotifsInboundKeysForDeviceSync(deviceID);
    String curve25519 = notifInboundKeys.getString("curve25519");
    // There are several reason to return JSON with curve25519 only:
    //    1. We only need curve25519 to create inbound session.
    //    2. In Session.cpp there is a convention to pass curve25519
    //       key as JSON and then add offset length to advance
    //       the string pointer.
    //    3. There is a risk that stringification might not preserve
    //       the order.
    return new JSONObject().put("curve25519", curve25519).toString();
  }
}
