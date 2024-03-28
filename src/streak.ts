import {
  ContributionData,
  GHCreatedAtResponse,
  GHTotalContributionsResponse,
  LongestStreakData,
  StreakData,
} from "./types";

export function GetCurrentDateTime(): string {
  const now = new Date();

  const pad = (num: number): string => num.toString().padStart(2, "0");

  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hours = pad(now.getUTCHours());
  const minutes = pad(now.getUTCMinutes());
  const seconds = pad(now.getUTCSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

async function getTotalContributions(
  username: string,
  dateNow: string,
  dateCreated: string
): Promise<number> {
  const graphqlQuery = {
    query: `
        query GetUserContributions($username: String!, $dateNow: DateTime!, $dateCreated: DateTime!) {
          user(login: $username) {
            contributionsCollection(
              from: $dateCreated
              to: $dateNow
            ) {
              contributionCalendar {
                totalContributions
              }
            }
          }
        }
      `,
    variables: {
      username: username,
      dateNow: dateNow,
      dateCreated: dateCreated,
    },
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "flareghstats",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    },

    body: JSON.stringify(graphqlQuery),
  };

  const response = await fetch("https://api.github.com/graphql", options);
  const jsonResponse: GHTotalContributionsResponse = await response.json();
  const totalContributions: number =
    jsonResponse.data.user.contributionsCollection.contributionCalendar
      .totalContributions;

  return totalContributions;
}

export async function GetTotalContributionsAmount(
  username: string
): Promise<number> {
  const start = new Date(await GetCreatedAt(username));
  const end = new Date(GetCurrentDateTime());
  let currentYear = start.getFullYear();
  let amount = 0;

  while (currentYear <= end.getFullYear()) {
    if (currentYear === start.getFullYear()) {
      amount += await getTotalContributions(
        username,
        new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59)).toISOString(),
        start.toISOString()
      );
    } else if (currentYear === end.getFullYear()) {
      amount += await getTotalContributions(
        username,
        end.toISOString(),
        new Date(Date.UTC(currentYear, 0, 1)).toISOString()
      );
    } else {
      amount += await getTotalContributions(
        username,
        new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59)).toISOString(),
        new Date(Date.UTC(currentYear, 0, 1)).toISOString()
      );
    }
    currentYear++;
  }

  return amount;
}

export async function GetCreatedAt(username: string): Promise<string> {
  const graphqlQuery = {
    query: `
        query GetUserCreatedAt($username: String!) {
          user(login: $username) {
            createdAt
          }
        }
      `,
    variables: {
      username: username,
    },
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "flareghstats",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify(graphqlQuery),
  };

  const response = await fetch("https://api.github.com/graphql", options);
  const jsonResponse: GHCreatedAtResponse = await response.json();
  const createdAt: string = jsonResponse.data.user.createdAt;

  return createdAt;
}

export async function GetContributionStreak(username: string) {
  const start = new Date(await GetCreatedAt(username));
  const end = new Date(GetCurrentDateTime());
  let currentYear = start.getFullYear();

  let contributions: {
    contributionCount: number;
    date: string;
  }[] = [];

  while (currentYear <= end.getFullYear()) {
    let startDate, endDate;
    if (currentYear === start.getFullYear()) {
      startDate = start.toISOString();
      endDate = new Date(Date.UTC(currentYear + 1, 0, 1)).toISOString(); // Start of next year
    } else if (currentYear === end.getFullYear()) {
      startDate = new Date(Date.UTC(currentYear, 0, 1)).toISOString(); // Start of this year
      endDate = end.toISOString();
    } else {
      startDate = new Date(Date.UTC(currentYear, 0, 1)).toISOString(); // Start of the current year
      endDate = new Date(Date.UTC(currentYear + 1, 0, 1)).toISOString(); // Start of next year
    }

    const graphqlQuery = {
      query: `
          query GetUserCreatedAt($username: String!, $start: DateTime!, $end: DateTime!) {
            user(login: $username) {
              contributionsCollection(from: $start, to: $end) {
                contributionCalendar {
                  weeks {
                    contributionDays {
                      contributionCount
                      date
                    }
                  }
                }
              }
            }
          }
        `,
      variables: {
        username: username,
        start: startDate,
        end: endDate,
      },
    };

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "flareghstats",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify(graphqlQuery),
    };

    try {
      const response = await fetch("https://api.github.com/graphql", options);
      const jsonResponse: {
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                weeks: Array<{
                  contributionDays: Array<{
                    contributionCount: number;
                    date: string;
                  }>;
                }>;
              };
            };
          };
        };
      } = await response.json();
      const weeks =
        jsonResponse.data.user.contributionsCollection.contributionCalendar
          .weeks;
      weeks.forEach(
        (week: {
          contributionDays: { contributionCount: number; date: string }[];
        }) => {
          week.contributionDays.forEach(
            (day: { contributionCount: number; date: string }) => {
              contributions.push(day);
            }
          );
        }
      );
    } catch (error) {
      console.error("Error fetching contributions:", error);
    }

    currentYear++;
  }

  return contributions;
}

export function CalculateStreakDays(
  contributionData: ContributionData[]
): StreakData {
  let streakDays = 0;
  let skippedFirstZero = false;
  let streakDates = [];

  for (let i = contributionData.length - 1; i >= 0; i--) {
    if (contributionData[i]!.contributionCount > 0) {
      streakDays++;
      streakDates.push(contributionData[i]?.date);
    } else {
      if (!skippedFirstZero) {
        skippedFirstZero = true;
        continue;
      }
      break;
    }
  }

  console.log(streakDates)

  return {
    streakDays,
    streakStartDate: streakDates[streakDates.length - 1],
    streakEndDate: streakDates[0],
  };
}

export function CalculateLongestStreak(
  contributionData: ContributionData[]
): LongestStreakData {
  let currentStreak = 0;
  let longestStreak = 0;
  let currentStreakStartDate: string | undefined = "";
  let longestStreakStartDate: string | undefined = "";
  let longestStreakEndDate: string | undefined = "";

  for (let i: number = 0; i < contributionData.length; i++) {
    if (contributionData[i]!.contributionCount > 0) {
      currentStreak++;
      if (currentStreak === 1) {
        currentStreakStartDate = contributionData[i]?.date;
      }
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStartDate = currentStreakStartDate;
        longestStreakEndDate = contributionData[i]?.date;
      }
    } else {
      currentStreak = 0;
    }
  }

  return {
    longestStreakDays: longestStreak,
    longestStreakStartDate: longestStreakStartDate,
    longestStreakEndDate: longestStreakEndDate,
  };
}

declare const GITHUB_TOKEN: string;
