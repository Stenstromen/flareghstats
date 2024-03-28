import {
  GHJSONResponse,
  GHJSONResponseNodes,
  LanguageTotals,
  LanguagesArray,
} from "./types";

export async function GetLanguages(
  username: string
): Promise<LanguagesArray[]> {
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

      languageTotals[name]!.size += size;
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

export function GenerateLangSVG(languagesArray: LanguagesArray[]): string {
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

declare const GITHUB_TOKEN: string;
