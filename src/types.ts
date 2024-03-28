export interface GHJSONResponse {
  data: {
    user: {
      repositories: {
        nodes: {
          languages: {
            edges: {
              size: number;
              node: {
                color: string;
                name: string;
              };
            }[];
          };
        }[];
      };
    };
  };
}

export interface LanguagesArray {
  language: string;
  size: number;
  color: string;
  percentage: number;
}

export interface LanguageTotals {
  [key: string]: { size: number; color: string };
}

export interface GHJSONResponseNodes {
  languages: {
    edges: { size: number; node: { color: string; name: string } }[];
  };
}


export interface ContributionData {
  contributionCount: number;
  date: string;
}

export interface StreakData {
  streakDays: number;
  streakStartDate: string | undefined;
  streakEndDate: string | undefined;
}

export interface LongestStreakData {
  longestStreakDays: number;
  longestStreakStartDate: string | undefined;
  longestStreakEndDate: string | undefined;
}

export interface GHTotalContributionsResponse {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
        };
      };
    };
  };
}

export interface GHCreatedAtResponse {
  data: {
    user: {
      createdAt: string;
    };
  };
}
