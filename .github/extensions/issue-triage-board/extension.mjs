import { createServer } from "node:http";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const issues = [
  {
    number: 8,
    title: "Update our repository coding standards",
    summary: "Document comment intent, exported function docs, and component contracts so the codebase uses a consistent, maintainable standard.",
    whyNow: "This is the freshest issue in the backlog and it directly affects contributor quality, reviewer consistency, and how future AI-generated changes are judged.",
    priority: "High",
  },
  {
    number: 6,
    title: "Implement pagination on the game list page",
    summary: "Add page/limit support, pagination controls, and coverage for the growing catalog so the list stays performant as the dataset increases.",
    whyNow: "The backlog is already growing and pagination is a user-facing performance issue that will hit the catalogue as soon as the list gets larger.",
    priority: "High",
  },
  {
    number: 5,
    title: "Show a catalog summary on the home page",
    summary: "Display total games and average rating at a glance so visitors get useful context before exploring the catalogue.",
    whyNow: "It is small, valuable, and likely to improve both conversion and UX while being straightforward to implement without broad dependency changes.",
    priority: "Medium",
  },
  {
    number: 4,
    title: "Add a publisher page listing that publisher's games",
    summary: "Create a static publisher page that lists all games from a publisher and links to it from the catalog.",
    whyNow: "Good navigation improvement but less urgent than the repo quality and performance issues above.",
    priority: "Medium",
  },
  {
    number: 3,
    title: "Show category and publisher descriptions on the game detail page",
    summary: "Surface existing descriptions so backers get richer context on each game without altering the schema.",
    whyNow: "Useful improvement, but it is weaker than the immediate backlog and performance concerns.",
    priority: "Medium",
  },
  {
    number: 2,
    title: "Allow users to sort the game list",
    summary: "Add sorting controls for title and star rating so players can browse the list in the way that suits them best.",
    whyNow: "Useful functionality, but lower near-term urgency than repo standards and performance work.",
    priority: "Medium",
  },
  {
    number: 1,
    title: "Add a search box to find games by title",
    summary: "Add a searchable title filter to let users quickly narrow the list as they browse.",
    whyNow: "A nice usability improvement, but it is not as likely to unblock work or improve the product as the top-three issues above.",
    priority: "Lower",
  },
];

const topIssues = issues.slice(0, 3);
const lowerIssues = issues.slice(3);
const servers = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function issueButton(issue) {
  return `<button type="button" data-number="${issue.number}" data-title="${escapeHtml(issue.title)}" data-summary="${escapeHtml(issue.summary)}">Add to current context</button>`;
}

function renderCards(cardIssues, topCard) {
  return cardIssues.map((issue) => `
    <article class="card${topCard ? " top-card" : ""}">
      <div class="card-header">
        <div class="issue-number">#${issue.number}</div>
        <div class="priority">${issue.priority}</div>
      </div>
      <h2 class="title">${escapeHtml(issue.title)}</h2>
      <p class="summary">${escapeHtml(issue.summary)}</p>
      ${topCard ? `<div class="why"><strong>Why it is at the top:</strong> ${escapeHtml(issue.whyNow)}</div>` : ""}
      <div class="actions">${issueButton(issue)}</div>
    </article>
  `).join("");
}

function renderHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Issue triage board</title>
    <style>
      :root {
        --bg: #0b1220; --panel: #121d2f; --card: #172538;
        --border: rgba(148, 163, 184, 0.2); --text: #e2e8f0;
        --muted: #94a3b8; --blue: #60a5fa; --purple: #a78bfa;
        --amber: #f59e0b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0; padding: 20px; background: var(--bg); color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .board { max-width: 1200px; margin: 0 auto; }
      .header, .section-header, .card-header {
        display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
      }
      .header { align-items: center; margin-bottom: 18px; }
      h1 { margin: 0; font-size: 1.8rem; }
      .section { margin-top: 26px; }
      .section-header { align-items: center; justify-content: flex-start; margin-bottom: 12px; }
      .label {
        padding: 4px 10px; border-radius: 999px; font-size: 0.72rem;
        font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
      }
      .label-top { background: rgba(96, 165, 250, 0.12); color: var(--blue); }
      .label-later { background: rgba(167, 139, 250, 0.12); color: var(--purple); }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
      .card {
        background: linear-gradient(180deg, rgba(23, 37, 56, 1), rgba(17, 25, 38, 1));
        border: 1px solid var(--border); border-radius: 16px; padding: 16px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
      }
      .top-card { border-color: rgba(96, 165, 250, 0.4); }
      .card-header { margin-bottom: 12px; }
      .issue-number { color: var(--blue); font-weight: 700; font-size: 0.85rem; }
      .priority {
        font-size: 0.7rem; padding: 5px 8px; border-radius: 8px;
        background: rgba(245, 158, 11, 0.12); color: var(--amber);
        border: 1px solid rgba(245, 158, 11, 0.25);
      }
      .title { margin: 0 0 8px; font-size: 1.08rem; line-height: 1.4; }
      .summary, .why { color: var(--muted); line-height: 1.6; }
      .summary { margin: 0; }
      .why { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
      .why strong { color: var(--blue); }
      .actions { margin-top: 16px; }
      button {
        width: 100%; padding: 10px 12px; border-radius: 10px; cursor: pointer;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(168, 85, 247, 0.18));
        border: 1px solid rgba(96, 165, 250, 0.4); color: var(--text); font-weight: 600;
      }
      button:hover { border-color: rgba(96, 165, 250, 0.8); }
      button:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
    </style>
  </head>
  <body>
    <main class="board">
      <div class="header">
        <h1>Issue triage board</h1>
        <div class="label label-top">Current focus</div>
      </div>
      <section class="section">
        <div class="section-header">
          <div class="label label-top">Top 3</div>
          <span style="color: var(--muted);">Most likely to deserve attention right now</span>
        </div>
        <div class="cards">${renderCards(topIssues, true)}</div>
      </section>
      <section class="section">
        <div class="section-header">
          <div class="label label-later">Remaining</div>
          <span style="color: var(--muted);">Good follow-up work after the top priorities</span>
        </div>
        <div class="cards">${renderCards(lowerIssues, false)}</div>
      </section>
    </main>
    <script>
      document.querySelectorAll('button[data-number]').forEach((button) => {
        button.addEventListener('click', async () => {
          button.textContent = 'Adding...';
          button.disabled = true;
          const response = await fetch('/add-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              number: button.dataset.number,
              title: button.dataset.title,
              summary: button.dataset.summary
            })
          });
          button.textContent = response.ok ? 'Added to current context' : 'Retry add to context';
          button.disabled = response.ok;
        });
      });
    </script>
  </body>
</html>`;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

const session = await joinSession({
  canvases: [
    createCanvas({
      id: "issue-triage-board",
      displayName: "Issue triage board",
      description: "Quickly review the highest-value backlog items and add one to the current session context.",
      actions: [
        {
          name: "add_issue_to_context",
          description: "Adds an issue card to the current session context so the user can work on it immediately.",
          inputSchema: {
            type: "object",
            properties: {
              number: { type: "number" },
              title: { type: "string" },
              summary: { type: "string" },
            },
            required: ["number", "title", "summary"],
          },
          handler: async (ctx) => {
            const { number, title, summary } = ctx.input ?? {};
            await session.send({
              prompt: [
                `Please add issue #${number} to the current context and help me triage it next.`,
                `Title: ${title}`,
                `Summary: ${summary}`,
              ].join("\n"),
            });
            return { ok: true, number };
          },
        },
      ],
      open: async (ctx) => {
        let entry = servers.get(ctx.instanceId);
        if (!entry) {
          entry = await startServer();
          servers.set(ctx.instanceId, entry);
        }
        return { title: "Issue triage board", url: entry.url };
      },
      onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (entry) {
          servers.delete(ctx.instanceId);
          await new Promise((resolve) => entry.server.close(() => resolve()));
        }
      },
    }),
  ],
});

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      if (request.url === "/add-context" && request.method === "POST") {
        const payload = await readRequestBody(request);
        await session.send({
          prompt: [
            `Please add issue #${payload.number} to the current context and help me triage it next.`,
            `Title: ${payload.title}`,
            `Summary: ${payload.summary}`,
          ].join("\n"),
        });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, number: Number(payload.number) }));
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderHtml());
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, url: `http://127.0.0.1:${port}/` };
}
