use lazy_static::lazy_static;
use tokio::runtime::Runtime;

pub mod apns;

lazy_static! {
    // Lazy static Tokio runtime initialization
    pub static ref RUNTIME: Runtime = Runtime::new().unwrap();
}
