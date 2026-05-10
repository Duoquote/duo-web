import { execSync } from "node:child_process";

function getCommitSha(): string {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function getBranch(): string {
  if (process.env.CF_PAGES_BRANCH) return process.env.CF_PAGES_BRANCH;
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

export const COMMIT_SHA = getCommitSha();
export const COMMIT_SHORT = COMMIT_SHA ? COMMIT_SHA.slice(0, 7) : "dev";
export const BRANCH = getBranch();
export const BUILD_TIME = new Date().toISOString();
export const REPO_URL = "https://github.com/Duoquote/duo-web";
export const COMMIT_URL = COMMIT_SHA
  ? `${REPO_URL}/commit/${COMMIT_SHA}`
  : REPO_URL;
