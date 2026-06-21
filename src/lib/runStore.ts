import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { WorkflowRun } from "./types";

export class FileWorkflowRunStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<WorkflowRun[]> {
    try {
      const content = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? (parsed as WorkflowRun[]) : [];
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async upsert(run: WorkflowRun): Promise<void> {
    const runs = await this.list();
    const nextRuns = [run, ...runs.filter((item) => item.id !== run.id)];
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(nextRuns, null, 2), "utf8");
  }
}
