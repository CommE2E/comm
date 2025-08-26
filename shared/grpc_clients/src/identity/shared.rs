use tonic::{
  metadata::{errors::InvalidMetadataValue, Ascii, MetadataValue},
  service::Interceptor,
  Request, Status,
};

#[derive(Clone, Debug)]
pub struct PlatformMetadata {
  pub device_type: String,
  pub code_version: u64,
  pub state_version: Option<u64>,
  pub major_desktop_version: Option<u64>,
}

#[derive(Clone, Debug)]
pub struct CodeVersionLayer {
  pub(crate) code_version: u64,
  pub(crate) device_type: String,
  pub(crate) state_version: Option<u64>,
  pub(crate) major_desktop_version: Option<u64>,
}

impl PlatformMetadata {
  /// Simplified constructor for basic params only
  pub fn new(code_version: u64, device_type: impl Into<String>) -> Self {
    Self {
      code_version,
      device_type: device_type.into(),
      state_version: None,
      major_desktop_version: None,
    }
  }
}

impl From<PlatformMetadata> for CodeVersionLayer {
  fn from(value: PlatformMetadata) -> Self {
    Self {
      code_version: value.code_version,
      device_type: value.device_type,
      state_version: value.state_version,
      major_desktop_version: value.major_desktop_version,
    }
  }
}

impl Interceptor for CodeVersionLayer {
  fn call(&mut self, mut request: Request<()>) -> Result<Request<()>, Status> {
    let metadata = request.metadata_mut();
    metadata.insert("code_version", self.code_version.parse_to_ascii()?);
    metadata.insert("device_type", self.device_type.parse_to_ascii()?);

    if let Some(state_version) = self.state_version {
      metadata.insert("state_version", state_version.parse_to_ascii()?);
    }
    if let Some(desktop_version) = self.major_desktop_version {
      metadata
        .insert("major_desktop_version", desktop_version.parse_to_ascii()?);
    }

    Ok(request)
  }
}

pub trait ToMetadataValueAscii {
  fn parse_to_ascii(&self) -> Result<MetadataValue<Ascii>, Status>;
}

impl ToMetadataValueAscii for u64 {
  fn parse_to_ascii(&self) -> Result<MetadataValue<Ascii>, Status> {
    let ascii_string = self.to_string();

    ascii_string.parse().map_err(|_: InvalidMetadataValue| {
      Status::invalid_argument("non_ascii_character_in_metadata_value")
    })
  }
}

#[derive(Clone, Debug)]
pub struct ChainedInterceptor<A, B>
where
  A: Interceptor + Send + Sync + 'static,
  B: Interceptor + Send + Sync + 'static,
{
  pub(crate) first: A,
  pub(crate) second: B,
}

impl<A, B> Interceptor for ChainedInterceptor<A, B>
where
  A: Interceptor + Send + Sync + 'static,
  B: Interceptor + Send + Sync + 'static,
{
  fn call(&mut self, request: Request<()>) -> Result<Request<()>, Status> {
    let request = self.first.call(request)?;
    self.second.call(request)
  }
}
