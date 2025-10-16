export const PLAYBACK_RULES = {
	// completion
	COMPLETION_THRESHOLD_PCT: 90,
	MIN_SECONDS_BEFORE_AWARD: 3,

	// re-earn behavior
	ALLOW_REEARN_ON_REPLAY: false,

	// playback rate
	AWARD_ON_FAST_RATE: false,

	// active id safety
	REQUIRE_ACTIVE_TRACK_ID: true,

	// seek detection and penalty
	FORWARD_SEEK_THRESHOLD_SEC: 5, // treat >5s jump as forward seek
	DEDUCT_ON_FORWARD_SEEK: true, // ✅ enable deduction model
	FORWARD_SEEK_PENALTY_PCT: 0.1, // ✅ 10% per forward seek
} as const;
