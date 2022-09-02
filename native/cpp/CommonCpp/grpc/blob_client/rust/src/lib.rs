use lazy_static::lazy_static;
use tokio::runtime::{Builder, Runtime};

pub mod blob {
  tonic::include_proto!("blob");
}

lazy_static! {
  pub static ref RUNTIME: Runtime = Builder::new_multi_thread()
    .worker_threads(1)
    .max_blocking_threads(1)
    .enable_all()
    .build()
    .unwrap();
}
