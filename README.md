# FlareGHStats

This is a simple tool to get the stats of a GitHub user.
Built as a serverless function using [Cloudflare Workers](https://workers.cloudflare.com/).

## Usage

### Endpoints

`/lang/json?username=<username>` returns the stats of the most used languages by the user in JSON format.
`/lang/svg?username=<username>` returns the stats of the most used languages by the user in SVG format.

### Example Response

`/lang/json?username=anuraghazra`

```json
[
  {
    "language": "JavaScript",
    "size": 6237455,
    "color": "#f1e05a",
    "percentage": 0.76642
  },
  {
    "language": "HTML",
    "size": 809096,
    "color": "#e34c26",
    "percentage": 0.09942
  },
  {
    "language": "TypeScript",
    "size": 802371,
    "color": "#3178c6",
    "percentage": 0.09859
  }
]
```

`/lang/svg?username=anuraghazra`

<svg width="300" height="180" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="25" fill="#151515" /><rect width="270" height="10" x="10" y="22.5" rx="10" fill="#000000" /><rect width="214.5976" height="10" x="10" y="22.5" fill="#f1e05a" /><rect width="27.8376" height="10" x="224.5976" y="22.5" fill="#e34c26" /><rect width="27.6052" height="10" x="252.4352" y="22.5" fill="#3178c6" /><rect width="7.3668" height="10" x="280.04040000000003" y="22.5" fill="#563d7c" /><rect width="1.246" height="10" x="287.40720000000005" y="22.5" fill="#5686a5" /><rect width="0.7392" height="10" x="288.6532" y="22.5" fill="#f34b7d" /><rect width="0.154" height="10" x="289.3924" y="22.5" fill="#ff5a03" /><rect width="0.1148" height="10" x="289.5464" y="22.5" fill="#427819" /><rect width="0.10640000000000001" height="10" x="289.6612" y="22.5" fill="#dea584" /><rect width="0.0812" height="10" x="289.7676" y="22.5" fill="#00ADD8" /><circle cx="35" cy="65" r="5" fill="#f1e05a" /><text x="50" y="68.33333333333333" fill="#9c9c9c" font-family="Arial" font-size="12">JavaScript (76.6%)</text><circle cx="35" cy="90" r="5" fill="#e34c26" /><text x="50" y="93.33333333333333" fill="#9c9c9c" font-family="Arial" font-size="12">HTML (9.9%)</text><circle cx="35" cy="115" r="5" fill="#3178c6" /><text x="50" y="118.33333333333333" fill="#9c9c9c" font-family="Arial" font-size="12">TypeScript (9.9%)</text><circle cx="35" cy="140" r="5" fill="#563d7c" /><text x="50" y="143.33333333333334" fill="#9c9c9c" font-family="Arial" font-size="12">CSS (2.6%)</text><circle cx="35" cy="165" r="5" fill="#5686a5" /><text x="50" y="168.33333333333334" fill="#9c9c9c" font-family="Arial" font-size="12">GLSL (0.4%)</text><circle cx="165" cy="65" r="5" fill="#f34b7d" /><text x="180" y="68.33333333333333" fill="#9c9c9c" font-family="Arial" font-size="12">C++ (0.3%)</text><circle cx="165" cy="90" r="5" fill="#ff5a03" /><text x="180" y="93.33333333333333" fill="#9c9c9c" font-family="Arial" font-size="12">Astro (0.1%)</text><circle cx="165" cy="115" r="5" fill="#427819" /><text x="180" y="118.33333333333333" fill="#9c9c9c" font-family="Arial" font-size="12">Makefile (0.0%)</text><circle cx="165" cy="140" r="5" fill="#dea584" /><text x="180" y="143.33333333333334" fill="#9c9c9c" font-family="Arial" font-size="12">Rust (0.0%)</text><circle cx="165" cy="165" r="5" fill="#00ADD8" /><text x="180" y="168.33333333333334" fill="#9c9c9c" font-family="Arial" font-size="12">Go (0.0%)</text></svg>

## Deploy

### Prerequisites

- [Cloudflare Account](https://dash.cloudflare.com/)
- [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler/install-update)
- GitHub Personal Access Token

### Dev 

```bash
echo "GITHUB_TOKEN=<your_github_token>" > .dev.vars
npm install
wrangler dev
curl http://localhost:8787/lang/json?username=anuraghazra
```

### Production

```bash
npm install
wrangler secret put GITHUB_TOKEN
wrangler publish
```
