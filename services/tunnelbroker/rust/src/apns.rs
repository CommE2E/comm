use crate::RUNTIME;
use a2::{
    Client, Endpoint, NotificationBuilder, NotificationOptions, PlainNotificationBuilder, Response,
};
use log::info;
use std::fs::File;
use std::os::raw::c_char;

#[no_mangle]
#[allow(non_snake_case)]
pub unsafe extern "C" fn sendNotifToAPNS(
    certificatePath: *const c_char,
    certificatePassword: *const c_char,
    deviceToken: *const c_char,
    message: *const c_char,
    sandbox: bool,
) -> bool {
    // Conversions from C variables to Rust
    let certificatePath: String = {
        std::ffi::CStr::from_ptr(certificatePath)
            .to_str()
            .unwrap()
            .to_string()
    };
    let certificatePassword: String = {
        std::ffi::CStr::from_ptr(certificatePassword)
            .to_str()
            .unwrap()
            .to_string()
    };
    let deviceToken: String = {
        std::ffi::CStr::from_ptr(deviceToken)
            .to_str()
            .unwrap()
            .to_string()
    };
    let message: String = {
        std::ffi::CStr::from_ptr(message)
            .to_str()
            .unwrap()
            .to_string()
    };
    // Because of C++ doesn't know how to 'Panic' we need to catch all the panics
    let result = std::panic::catch_unwind(|| {
        RUNTIME.block_on(async {
            sendByA2Client(
                &certificatePath,
                &certificatePassword,
                &deviceToken,
                &message,
                sandbox,
            )
            .await;
        })
    });
    match result {
        Ok(runtimeResult) => {
            info!(
                "Push notification to device token {:?} was sent to APNS with the result {:?}",
                deviceToken, runtimeResult
            );
        }
        Err(err) => {
            eprintln!(
                "Error: Panic catched from the Rust notification library in a sendByA2Client: {:?}",
                err
            );
            return false;
        }
    }
    true
}

#[allow(non_snake_case)]
async fn sendByA2Client(
    certificatePath: &String,
    certificatePassword: &String,
    deviceToken: &String,
    message: &String,
    sandbox: bool,
) -> Response {
    // Read the private key and certificate from the disk
    let mut certificate = File::open(certificatePath).unwrap();
    // Which service to call: test or production
    let endpoint = if sandbox {
        Endpoint::Sandbox
    } else {
        Endpoint::Production
    };
    // Connects to APNs using a client certificate
    let client = Client::certificate(&mut certificate, &certificatePassword, endpoint).unwrap();
    let options = NotificationOptions {
        ..Default::default()
    };
    // Notification payload
    let mut builder = PlainNotificationBuilder::new(message.as_ref());
    builder.set_sound("default");
    builder.set_badge(1u32);
    let payload = builder.build(deviceToken.as_ref(), options);
    client.send(payload).await.unwrap()
}
