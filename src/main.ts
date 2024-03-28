addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

import { GenerateLangSVG, GetLanguages } from "./lang";
import {
  CalculateLongestStreak,
  CalculateStreakDays,
  GetContributionStreak,
  GetCreatedAt,
  GetTotalContributionsAmount,
} from "./streak";
/**
 *
 * @param {Request} request
 * @returns
 */

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

    const languagesArray = await GetLanguages(username);

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

    const languagesArray = await GetLanguages(username);
    const svgContent = GenerateLangSVG(languagesArray);

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

    const contributionStreak = await GetContributionStreak(username);
    const streakDays = CalculateStreakDays(contributionStreak);
    const longestStreak = CalculateLongestStreak(contributionStreak);

    const resp = {
      createdAt: await GetCreatedAt(username),
      totalContributions: await GetTotalContributionsAmount(username),
      streakDays: streakDays.streakDays,
      streakStartDate: streakDays.streakStartDate,
      streakEndDate: streakDays.streakEndDate,
      longestStreakDays: longestStreak.longestStreakDays,
      longestStreakStartDate: longestStreak.longestStreakStartDate,
      longestStreakEndDate: longestStreak.longestStreakEndDate,
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
