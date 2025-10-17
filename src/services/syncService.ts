// Simulate a server save with latency + occasional failure
export const saveCompletionServer = async (payload: {
	challengeId: string;
	pointsAwarded: number;
}) => {
	await new Promise((res) => setTimeout(res, 400));
	// 90% success simulation
	if (Math.random() < 0.9) return { ok: true };
	throw new Error('Network error');
};
