# FlowForge

AI-powered workflow visualizer that turns plain English descriptions into visual workflow diagrams.

## What It Does

Describe a business process in natural language and FlowForge breaks it down into a step-by-step visual flow chart. Each step is categorized as a trigger, process, condition, action, or output node.

## Tech Stack

- **Frontend:** React + Vite
- **AI:** Claude API (Anthropic)
- **Deployment:** Vercel (serverless)

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env` and add your `ANTHROPIC_API_KEY`
3. Install dependencies and run:

```bash
npm install
npm run dev
```

## Project Structure

```
src/        → React frontend (App, styles)
api/        → Serverless backend (Claude integration)
public/     → Static assets
```
