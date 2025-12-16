This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Introduction
Our project, **Stock Market Decision Support System Based on AI Agent**, provides an intelligent assistant that autonomously retrieves real-time stock data, analyzes company fundamentals, monitors price alerts, summarizes related news, and generates visual charts.

## Getting Started
First, run the development server:

```bash
cd ELEC5620_project_StockAIAgent
npm install
npm run dev
```

Second, config your **database server**, **AI API**, and JWT Secret.
```bash
cd .env.example
```
You should input your **AI API Key**, **JWT Secret** and **MongoDB Connection String** in this file.


You can get your **API key** from: https://makersuite.google.com/app/apikey
You can generate **JWT Secret** with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
The **MongoDB Connection String** format: mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority



Third, Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Structure
This is the overall project structure. All main folders and configuration files are at the root level.

````
├── app               	# pages
├── components
├── lib
├── models
│   ├── Conversation.ts
│   ├── Message.ts
│   └── User.ts
├── public             # Static assets (svg images)
├── store
│   └── chartStore.ts  # Store for managing chart state
├── types
├── .env.example       # Environment variables(AI API Key,JWT Secret,MongoDB Connection String)
├── eslint.config.mjs
├── main.py            # Main program
├── next-env.d.ts
├── next.config.ts
├── nodemon.dev.json
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.ts
````

## Dependencies

Framework: Next.js

Database: MongoDB

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.



## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Stock Price Monitor (Mock Email)

This app now supports real-time stock price monitoring backed by Yahoo Finance polling and mock email notifications (SendGrid not required yet).

- API endpoints:
  - `POST /api/monitor/start` — start a monitor
    - body: `{ conversationId, ticker, rule: { type: 'above'|'below'|'percentChange', value: number }, intervalSeconds?, durationMinutes? }`
  - `POST /api/monitor/stop` — stop a monitor or all in a conversation
    - body: `{ conversationId, taskId? }`
  - `GET /api/monitor/status?conversationId=...` — list conversation monitors

- Limits and behavior:
  - Max 3 concurrent monitors per conversation
  - Max duration 30 minutes; auto-expires and stops
  - Triggers send a single mock email (logged to server console) and stop
  - Deleting a conversation stops all its monitors automatically

- Chat integration:
  - A new tool `monitor_stock_price` is available to the AI agent.
  - Example prompts:
    - “Notify me when AAPL drops below 180.”
    - “Monitor TSLA. Alert me (every 30 minutes) when the increase exceeds 2%.”

## Incorporation of Advanced Technologies
Framework: Next.js
Database: MongoDB
Front-end style: PostCSS
External API: Google AI api(Gemini), yfinance, sendgrid
Token: JWT Secret
