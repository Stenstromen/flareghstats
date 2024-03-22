interface Env {
  GITHUB_TOKEN: string;
}

addEventListener("fetch", (event: FetchEvent) => {
	event.respondWith(handleRequest(event.request));
});

/**
 *
 * @param request
 * @returns
 */

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const { searchParams } = url;

  if (path === "/") {
    return new Response("Hello, world!", {
      headers: { "content-type": "text/plain" },
    });
  }

  if (path === "/ghstats/get" && request.method === "GET") {
    const username = searchParams.get("username");
    if (!username) {
      return new Response("Missing username", {
        status: 400,
        headers: { "content-type": "text/plain" },
      });
    }

const response = await fetch(`https://api.github.com/users/${username}`, {
	headers: {
		Authorization: `token ${env.GITHUB_TOKEN}`,
		Accept: "application/vnd.github.v3+json",
		"User-Agent": "ghstats",
		"X-GitHub-Api-Version": "2022-11-28",
		"Content-Type": "application/json",
	},
});

    if (!response.ok) {
      return new Response("API request failed", {
        status: response.status,
        headers: { "content-type": "text/plain" },
      });
    }

    const data = (await response.json()) as { public_repos: number };

    return new Response(JSON.stringify(data.public_repos), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain" },
  });
}
