import { task, logger } from "@trigger.dev/sdk/v3";
import { runPipeline } from "@/lib/pipeline";
import { prisma } from "@/lib/db";

export interface UserPipelinePayload {
  userId: string;
  threshold?: number;
  maxJobs?: number;
  tone?: "professional" | "conversational" | "enthusiastic";
  pipelineRunId?: string;
}

/**
 * Per-user pipeline task — wraps runPipeline() so it runs outside Vercel's
 * 60-second timeout limit with automatic retries and full logging.
 *
 * Triggered from POST /api/pipeline/run (user-initiated) and
 * from daily-pipeline.ts (scheduled daily run).
 */
export const userPipelineTask = task({
  id: "user-pipeline",
  retry: { maxAttempts: 2 },
  run: async (payload: UserPipelinePayload) => {
    logger.info("Starting pipeline", { userId: payload.userId });

    try {
      const result = await runPipeline({
        userId: payload.userId,
        threshold: payload.threshold,
        maxJobs: payload.maxJobs,
        tone: payload.tone,
        pipelineRunId: payload.pipelineRunId,
      });

      logger.info("Pipeline complete", {
        userId: payload.userId,
        newJobs: result.newJobsCount,
        analyzed: result.analyzedCount,
        coverLetters: result.coverLetterCount,
      });

      return result;
    } catch (err) {
      // If the run record exists, mark it failed so the UI reflects it
      if (payload.pipelineRunId) {
        await prisma.pipelineRun.update({
          where: { id: payload.pipelineRunId },
          data: {
            status: "failed",
            completedAt: new Date(),
            errors: JSON.stringify([
              err instanceof Error ? err.message : String(err),
            ]),
          },
        }).catch(() => undefined); // best-effort — don't mask the original error
      }
      throw err;
    }
  },
});
