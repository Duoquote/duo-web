const CAREER_START = new Date(2020, 6); // July 2020

export function getYearsOfExperience(): number {
  const now = new Date();
  const diff = now.getTime() - CAREER_START.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
