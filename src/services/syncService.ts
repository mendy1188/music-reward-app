// Simulate a server save with latency + occasional failure
export type CompletionPayload = {
	challengeId: string;
	pointsAwarded: number;
	// optional diagnostics we might want to send too:
	pointsDeducted?: number;
	forwardSeeks?: number;
	peakRate?: number;
};

export async function saveCompletionServer(payload: CompletionPayload): Promise<void> {
    // Simulate latency + occasional failure
    await new Promise((r) => setTimeout(r, 350));
    // Optional: throw sometimes to exercise optimistic rollback flows
    // if (Math.random() < 0.1) throw new Error('Network glitch');
    // When move to real app, POST payload to our backend here
    return;
}
