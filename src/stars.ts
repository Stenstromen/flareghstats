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
    viewBox='0 0 320 180' width='320' height='180'>
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0d1117;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ffb300;stop-opacity:1" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="textShadow">
        <feDropShadow dx="2" dy="2" stdDeviation="1" flood-color="#000000" flood-opacity="0.3"/>
      </filter>
    </defs>
    
    <!-- Background with gradient and border -->
    <rect width='100%' height='100%' rx='15' ry='15' fill='url(#bgGradient)' stroke='#30363d' stroke-width='1'/>
    
    <!-- Decorative stars in background -->
    <circle cx="280" cy="30" r="1.5" fill="#ffd700" opacity="0.3"/>
    <circle cx="295" cy="45" r="1" fill="#ffd700" opacity="0.4"/>
    <circle cx="285" cy="160" r="1.2" fill="#ffd700" opacity="0.3"/>
    
    <!-- Main star icon with glow -->
    <g transform="translate(40, 55)">
      <path d="M25 5 L30.5 19.5 L46 19.5 L33.5 30 L39 44.5 L25 34 L11 44.5 L16.5 30 L4 19.5 L19.5 19.5 Z" 
        fill="url(#starGradient)" 
        stroke="#ffd700" 
        stroke-width="1" 
        filter="url(#glow)"/>
    </g>
    
    <!-- Star count with shadow -->
    <text x="130" y="90" font-family="'Segoe UI', 'Arial', sans-serif" font-size="36" fill="#f0f6fc" font-weight="bold" filter="url(#textShadow)">
      ${totalStars.toLocaleString()}
    </text>
    
    <!-- Decorative line -->
    <line x1="130" y1="105" x2="${130 + Math.min(150, totalStars.toString().length * 20)}" y2="105" stroke="#ffd700" stroke-width="2" opacity="0.7"/>
  </svg>`;

  return svgTemplate;
}

declare const GITHUB_TOKEN: string;
