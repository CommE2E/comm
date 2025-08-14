/// This table holds tokens that need socket connections maintained
///
/// - (primary key) = (userID: Partition Key)
/// - userID: User identifier, each user with connected Farcaster DCs
///           should have exactly one socket connection
/// - farcasterID: Farcaster identifier
/// - farcasterDCsToken: Farcaster token
/// - assignedInstance: Instance ID (Tunnelbroker process) that owns this token
/// - assignmentTimestamp: When the token was assigned to instance
/// - lastHeartbeat: When the assigned instance last sent heartbeat
pub mod farcaster_tokens {
  pub const TABLE_NAME: &str = "farcaster-tokens";
  pub const PARTITION_KEY: &str = "userID";
  pub const FARCASTER_ID: &str = "farcasterID";
  pub const FARCASTER_DCS_TOKEN: &str = "farcasterDCsToken";
  pub const ASSIGNED_INSTANCE: &str = "assignedInstance";
  pub const ASSIGNMENT_TIMESTAMP: &str = "assignmentTimestamp";
  pub const LAST_HEARTBEAT: &str = "lastHeartbeat";

  pub const ASSIGNED_INSTANCE_INDEX: &str = "assignedInstance-index";
  pub const LAST_HEARTBEAT_INDEX: &str = "lastHeartbeat-index";
}
