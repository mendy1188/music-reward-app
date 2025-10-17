export const PLAYBACK_RULES = {
	/** % complete needed to mark a challenge finished */
	COMPLETION_THRESHOLD_PCT: 90,

	/** Ignore award attempts if the position is still near zero (debounce) */
	MIN_SECONDS_BEFORE_AWARD: 3,

	/** Do not re-earn once completed */
	ALLOW_REEARN_ON_REPLAY: false,

	/** If false, a forward seek suppresses awards for the current session of that track */
	DEDUCT_ON_FORWARD_SEEK: true,
	FORWARD_SEEK_PENALTY_PCT: 0.1, // 10% per forward seek
	FORWARD_SEEK_THRESHOLD_SEC: 5,
	REQUIRE_ACTIVE_TRACK_ID: true,

    /** We ALLOW awarding on fast rate, but apply a deduction instead. */
	AWARD_ON_FAST_RATE: true,

	/** Playback-rate penalties (applied once per completion using the highest rate used) */
	RATE_PENALTY_PCT: {
		1.25: 0.05, // -5%
		2.0: 0.15, // -15%
	} as const,
} as const;
