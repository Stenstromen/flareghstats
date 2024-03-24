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
