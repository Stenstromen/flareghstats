addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

/**
 *
 * @param {Request} request
 * @returns
 */

import {
  GHJSONResponse,
  LanguagesArray,
  GHJSONResponseNodes,
  LanguageTotals,
} from "./types";

function getCurrentDateTime(): string {
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

async function getCreatedAt(username: string): Promise<string> {
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
  const jsonResponse: any = await response.json();
  const createdAt = jsonResponse.data.user.createdAt;

  return createdAt;
}

async function getTotalContributionsAmount(username: string): Promise<number> {
  const start = new Date(await getCreatedAt(username));
  const end = new Date(getCurrentDateTime());
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

async function getTotalContributions(
  username: string,
  dateNow: string,
  dateCreated: string
): Promise<any> {
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
  const jsonResponse: any = await response.json();
  const totalContributions =
    jsonResponse.data.user.contributionsCollection.contributionCalendar
      .totalContributions;

  return totalContributions;
}

async function getLanguages(username: string): Promise<LanguagesArray[]> {
  const graphqlQuery = {
    query: `
      query GetUserLanguages($username: String!) {
        user(login: $username) {
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            nodes {
              languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
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
  const jsonResponse: GHJSONResponse = await response.json();
  const nodes = jsonResponse.data.user.repositories.nodes;

  const languageTotals: LanguageTotals = {};

  nodes.forEach((repo: GHJSONResponseNodes) => {
    repo.languages.edges.forEach((edge) => {
      const { name, color } = edge.node;
      const { size } = edge;

      if (!languageTotals[name]) {
        languageTotals[name] = { size: 0, color };
      }

      languageTotals[name].size += size;
    });
  });

  const totalSize = Object.values(languageTotals).reduce(
    (total, { size }) => total + size,
    0
  );

  const languagesArray = Object.entries(languageTotals).map(
    ([language, { size, color }]) => ({
      language,
      size,
      color,
      percentage: Number((size / totalSize).toFixed(5)),
    })
  );

  languagesArray.sort((a, b) => b.percentage - a.percentage);

  return languagesArray;
}

function generateSVG(languagesArray: LanguagesArray[]): string {
  if (languagesArray.length === 0) {
    return `<svg width="300" height="10" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }

  const width = 300;
  const columnWidth = 130;
  const columnsGap = 20;
  const totalColumnsWidth = columnWidth * 2 + columnsGap;
  const barHeight = 20;
  const gap = 5;
  const stackedBarHeight = 20;
  const topPadding = 30;
  const svgHeight =
    topPadding +
    stackedBarHeight +
    gap +
    Math.ceil(languagesArray.slice(0, 10).length / 2) * (barHeight + gap);

  const barStartX = (width - totalColumnsWidth) / 2;

  let svgContent = `<svg width="${width}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
  svgContent += `<rect width="100%" height="100%" rx="25" fill="#151515" />`;

  svgContent += `<rect width="${totalColumnsWidth - 10}" height="${
    stackedBarHeight - 10
  }" x="${barStartX}" y="22.5" rx="${stackedBarHeight / 2}" fill="#000000" />`;

  let cumulativeWidth = barStartX;
  for (const lang of languagesArray.slice(0, 10)) {
    const segmentWidth = lang.percentage * totalColumnsWidth;
    svgContent += `<rect width="${segmentWidth}" height="10" x="${cumulativeWidth}" y="22.5" fill="${lang.color}" />`;
    cumulativeWidth += segmentWidth;
  }

  languagesArray.slice(0, 10).forEach((lang, index) => {
    const column = index >= 5 ? 1 : 0;
    const x = column * columnWidth + 40 + barStartX;
    const rowIndex = index % 5;
    const y =
      topPadding + gap + rowIndex * (barHeight + gap) + stackedBarHeight;

    svgContent += `<circle cx="${x - 15}" cy="${
      y + barHeight / 2
    }" r="5" fill="${lang.color}" />`;
    svgContent += `<text x="${x}" y="${
      y + barHeight / 1.5
    }" fill="#9c9c9c" font-family="Arial" font-size="12">${lang.language} (${(
      lang.percentage * 100
    ).toFixed(1)}%)</text>`;
  });

  svgContent += `</svg>`;
  return svgContent;
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const { searchParams } = url;
  const readme = `FlareGHStats API
For usage, please refer to the README @ github.com/stenstromen/flareghstats
`;

  if (path === "/") {
    return new Response(readme, {
      headers: { "content-type": "text/plain" },
    });
  }

  if (path === "/lang/json" && request.method === "GET") {
    const username = searchParams.get("username");
    if (!username) {
      return new Response("Missing username", {
        status: 400,
        headers: { "content-type": "text/plain" },
      });
    }

    const languagesArray = await getLanguages(username);

    return new Response(JSON.stringify(languagesArray), {
      headers: { "content-type": "application/json" },
    });
  }

  if (path === "/lang/svg" && request.method === "GET") {
    const username = searchParams.get("username");
    if (!username) {
      return new Response("Missing username", {
        status: 400,
        headers: { "content-type": "text/plain" },
      });
    }

    const languagesArray = await getLanguages(username);
    const svgContent = generateSVG(languagesArray);

    return new Response(svgContent, {
      headers: {
        "content-type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, private, must-revalidate",
      },
    });
  }

  if (path === "/streak/json" && request.method === "GET") {
    const username = searchParams.get("username");
    if (!username) {
      return new Response("Missing username", {
        status: 400,
        headers: { "content-type": "text/plain" },
      });
    }

    const resp = {
      createdAt: await getCreatedAt(username),
      totalContributions: await getTotalContributionsAmount(username),
    };

    return new Response(JSON.stringify(resp), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain" },
  });
}

declare const GITHUB_TOKEN: string;
