export async function GetTotalStars(username: string): Promise<number> {
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalStars = 0;

  while (hasNextPage) {
    const graphqlQuery = {
      query: `
          query GetUserStars($username: String!, $after: String) {
            user(login: $username) {
              repositories(first: 100, after: $after) {
                nodes {
                  stargazerCount
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `,
      variables: {
        username: username,
        after: cursor,
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
    const data = (await response.json()) as {
      data: {
        user: {
          repositories: {
            nodes: { stargazerCount: number }[];
            pageInfo: { hasNextPage: boolean; endCursor: string };
          };
        };
      };
    };

    const repositories = data.data.user.repositories;
    totalStars += repositories.nodes.reduce(
      (sum: number, repo: { stargazerCount: number }) =>
        sum + repo.stargazerCount,
      0
    );

    hasNextPage = repositories.pageInfo.hasNextPage;
    cursor = repositories.pageInfo.endCursor;
  }

  return totalStars;
}

export function GenerateStarsSVG(totalStars: number): string {
  const svgTemplate = `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' 
    viewBox='0 0 200 100' width='200' height='100'>
    <rect width='100%' height='100%' rx='25' fill='#151515'/>
    <path d="M35 35 L44 17 L53 35 L73 37.5 L56 52 L60 70 L44 61 L28 70 L32 52 L15 37.5 L35 35Z" 
      fill="#FFD700" stroke="#FFD700" stroke-width="1"/>
    <text x="100" y="55" font-family="Arial" font-size="24" fill="white" font-weight="bold">
      ${totalStars.toLocaleString()}
    </text>
  </svg>`;

  return svgTemplate;
}

declare const GITHUB_TOKEN: string;
