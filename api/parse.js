export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description } = req.body;

  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Missing workflow description' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const systemPrompt = `You are a workflow decomposition engine. The user will describe a business process or automation in plain English. Your job is to break it into discrete sequential nodes.

Return ONLY a JSON array. No markdown, no backticks, no explanation. Each node object must have:
- "id": sequential number starting at 1
- "type": one of "trigger", "process", "condition", "action", "output"
- "label": 2-5 word title (e.g. "New Lead Arrives")
- "description": 1 sentence explaining what this step does
- "icon": one emoji that represents this step

Rules:
- First node is always type "trigger"
- Last node is always type "output"
- Use "condition" for any branching/decision logic
- Keep it to 4-8 nodes. Combine trivial steps.
- Be specific to the user's description, not generic

Example output:
[{"id":1,"type":"trigger","label":"Lead Form Submitted","description":"A new lead fills out the contact form on the website.","icon":"📩"},{"id":2,"type":"process","label":"Validate Lead Data","description":"Check that email and phone number are present and formatted correctly.","icon":"✅"},{"id":3,"type":"action","label":"Send SMS Response","description":"Text the lead within 30 seconds acknowledging their inquiry.","icon":"💬"},{"id":4,"type":"output","label":"Lead Qualified","description":"Lead is tagged as qualified and added to the agent's pipeline.","icon":"🎯"}]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: description }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';

    // Parse the JSON from Claude's response
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const nodes = JSON.parse(cleaned);

    return res.status(200).json({ nodes });
  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ error: 'Failed to parse workflow' });
  }
}
