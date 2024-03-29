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
  let currentStreak = 0;
  let lastDate = new Date();

  contributionData = contributionData.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streakStartDate: string | undefined = "";
  let streakEndDate: string | undefined = contributionData[0]?.date;

  for (let i = 0; i < contributionData.length; i++) {
    const currentDate = new Date(contributionData[i]!.date);
    const diff =
      (lastDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24);

    if (
      contributionData[i]!.contributionCount > 0 &&
      (diff === 1 || diff === 0 || (diff === 2 && !skippedFirstZero))
    ) {
      currentStreak++;
      if (diff === 2) {
        skippedFirstZero = true;
      }
      if (currentStreak === 1) {
        streakStartDate = contributionData[i]!.date;
      }
      streakDays = currentStreak;
    } else if (contributionData[i]!.contributionCount > 0) {
      currentStreak = 1;
      skippedFirstZero = false;
      streakStartDate = contributionData[i]!.date;
    } else {
      break;
    }

    lastDate = currentDate;
  }

  const startDate = new Date(streakEndDate!);
  startDate.setDate(startDate.getDate() - streakDays + 1);
  streakStartDate = startDate.toISOString().split("T")[0];

  return {
    streakDays,
    streakStartDate: streakStartDate,
    streakEndDate: streakEndDate,
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
    longestStreakStartDate: longestStreakEndDate,
    longestStreakEndDate: longestStreakStartDate,
  };
}

export function GenerateStreakSVG(data: {
  totalContributions: number;
  createdAt: string;
  streakDays: number;
  streakStartDate: string | undefined;
  streakEndDate: string | undefined;
  longestStreakDays: number;
  longestStreakStartDate: string | undefined;
  longestStreakEndDate: string | undefined;
}): string {
  const monthDayYear: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const monthDay: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const createdAtNoTime = data.createdAt.split("T")[0];
  const formatedCreatedAt = new Intl.DateTimeFormat(
    "en-US",
    monthDayYear
  ).format(new Date(createdAtNoTime || ""));
  const currentStreakStart = new Intl.DateTimeFormat("en-US", monthDay).format(
    new Date(data.streakStartDate || "")
  );
  const currentStreakEnd = new Intl.DateTimeFormat("en-US", monthDay).format(
    new Date(data.streakEndDate || "")
  );
  const longestStreakStart = new Intl.DateTimeFormat(
    "en-US",
    monthDayYear
  ).format(new Date(data.longestStreakStartDate || ""));
  const longestStreakEnd = new Intl.DateTimeFormat(
    "en-US",
    monthDayYear
  ).format(new Date(data.longestStreakEndDate || ""));

  const svgTemplate = `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' style='isolation: isolate'
  viewBox='0 0 495 195' height='190px' direction='ltr'>
  <g style='isolation: isolate'>
      <rect fill='#151515' rx='25' x='10' y='0.5' width='494' height='189' />
      <g style='isolation: isolate'>
          <g transform='translate(82.5,48)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#FEFEFE' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal'>
                  ${data.totalContributions}
              </text>
          </g>
          <g transform='translate(82.5,84)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#FEFEFE' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='14px' font-style='normal'>
                  Total Contributions
              </text>
          </g>
          <g transform='translate(82.5,114)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#9E9E9E' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal'>
                  ${formatedCreatedAt} - Present
              </text>
          </g>
      </g>
      <g style='isolation: isolate'>
          <g transform='translate(247.5,48)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#FEFEFE' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal'>
                  ${data.streakDays}
              </text>
          </g>
          <g transform='translate(247.5,108)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#11ab00' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='14px' font-style='normal'>
                  Current Streak
              </text>
          </g>
          <g transform='translate(247.5,145)'>
              <text x='0' y='21' stroke-width='0' text-anchor='middle' fill='#9E9E9E' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal'>
                  ${currentStreakStart} - ${currentStreakEnd}
              </text>
          </g>
          <g>
              <circle cx='247.5' cy='71' r='40' fill='none' stroke='#11ab00' stroke-width='5'></circle>
          </g>
      </g>
      <g style='isolation: isolate'>
          <g transform='translate(412.5,48)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#FEFEFE' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal'>
                  ${data.longestStreakDays}
              </text>
          </g>
          <g transform='translate(412.5,84)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#FEFEFE' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='14px' font-style='normal'>
                  Longest Streak
              </text> 
          </g>
          <g transform='translate(412.5,114)'>
              <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#9E9E9E' stroke='none'
                  font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal'>
                  ${longestStreakStart} - ${longestStreakEnd}
              </text>
          </g>
      </g>
  </g>
</svg>`;

  return svgTemplate;
}

declare const GITHUB_TOKEN: string;
