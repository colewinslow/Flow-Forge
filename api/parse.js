export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { description, apiKey: userKey } = req.body;

  if (!description || typeof description !== "string") {
    return res.status(400).json({ error: "Missing workflow description" });
  }

  const apiKey = userKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "No API key provided. Add your Anthropic API key in settings." });
  }

  const systemPrompt = `You are a workflow automation architect. The user will describe a business process. Break it into detailed, atomic automation steps for THREE platforms: n8n, Zapier, and Make.

Return ONLY a JSON object with three keys: "n8n", "zapier", "make". Each key contains an array of nodes for that platform. No markdown, no backticks, no explanation.

Each node object must have:
- "id": string like "node_1", "node_2", etc. Sequential per platform.
- "type": one of "webhook_trigger", "form_trigger", "schedule_trigger", "http_request", "code", "send_email", "send_sms", "condition", "delay", "set_variable", "database", "ai_call", "calendar", "spreadsheet", "crm_update", "slack", "transform"
- "platform_label": what this node/step is called in that specific platform (see guides below)
- "name": 2-5 word title for this step
- "description": 1-2 sentences explaining what this step does
- "icon": single emoji
- "connects_to": array of next node IDs. Empty array [] for final nodes.
- "branch": null for normal nodes. For condition nodes: { "true": "node_X", "false": "node_Y" }

Platform naming guides:

n8n — Webhook, Schedule Trigger, HTTP Request, IF, Switch, Merge, Set, Code, Send Email (SMTP), Slack, HubSpot, Google Sheets, Postgres, MySQL, OpenAI, Wait, Loop Over Items, Execute Workflow. n8n chains nodes linearly with IF/Switch for branching.

Zapier — Webhooks by Zapier, Schedule by Zapier, API Request by Zapier, Code by Zapier, Filter by Zapier, Paths by Zapier, Formatter by Zapier, Email by Zapier, Slack, HubSpot, Google Sheets, ChatGPT, Delay by Zapier. Zapier uses linear trigger-action chains with Paths for branching.

Make — Webhooks (Custom Webhook), Watch Rows, HTTP (Make a request), JSON, Router, Filter, Iterator, Aggregator, Email, Slack, Google Sheets, HubSpot, OpenAI (ChatGPT), Sleep, Set Variable. Make uses visual scenarios with Router + filters for branching.

Rules:
- First node must be a trigger type (webhook_trigger, form_trigger, or schedule_trigger)
- 5-12 granular atomic steps per platform. Don't combine multiple actions.
- Include data transformation/preparation steps where needed
- Use "condition" for branching. Condition nodes: branch set, connects_to empty. All others: connects_to set, branch null.
- Each platform's workflow can have DIFFERENT numbers of nodes and different structures — reflect how each platform actually works.
- Platform labels must match real node/module/step names for that platform.
- Be specific to the user's description.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{ role: "user", content: description }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude API error:", err);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";

    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const workflows = JSON.parse(cleaned);

    // Validate structure
    if (!workflows.n8n || !workflows.zapier || !workflows.make) {
      throw new Error("Missing platform data in response");
    }

    return res.status(200).json({ workflows });
  } catch (err) {
    console.error("Parse error:", err);
    return res.status(500).json({ error: "Failed to parse workflow" });
  }
}
