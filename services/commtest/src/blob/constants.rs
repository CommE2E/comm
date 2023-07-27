use std::ops::Range;
// Hack for passing None to Option<&impl RangeBounds<i64>> typed argument
pub const NO_RANGE: Option<&Range<i64>> = None;
