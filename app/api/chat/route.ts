// /app/api/chat/route.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import YahooFinance from 'yahoo-finance2';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { getUserFromRequest, AuthUser } from '@/lib/auth';
import { startMonitor, ThresholdRule } from '@/lib/monitor';

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    throw new Error("GOOGLE_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const runtime = 'nodejs';

let yahooFinanceInstance: any = null;

function getYahooFinanceInstance() {
    if (!yahooFinanceInstance) {
        yahooFinanceInstance = new YahooFinance();
    }
    return yahooFinanceInstance;
}

// Define the function for obtaining stock quotations
async function getStockQuote(ticker: string) {
    try {
        const yf = getYahooFinanceInstance();
        const quoteData = await yf.quote(ticker.toUpperCase());

        if (!quoteData || typeof quoteData.regularMarketPrice !== 'number') {
            return { success: false, error: `No data on the stock code "${ticker}" was found` };
        }

        return {
            success: true,
            data: {
                symbol: ticker.toUpperCase(),
                name: quoteData.longName || quoteData.shortName || ticker,
                price: quoteData.regularMarketPrice,
                currency: quoteData.currency || 'USD',
                change: quoteData.regularMarketChange,
                changePercent: quoteData.regularMarketChangePercent,
                dayLow: quoteData.regularMarketDayLow,
                dayHigh: quoteData.regularMarketDayHigh,
                volume: quoteData.regularMarketVolume,
                marketCap: quoteData.marketCap,
                previousClose: quoteData.regularMarketPreviousClose
            }
        };
    } catch (error: any) {
        console.error('[Stock Quote Error]:', error.message);
        return { success: false, error: error.message || 'An error occurred when querying stock data' };
    }
}

// Define the function for obtaining company news
async function getCompanyNews(ticker: string) {
    try {
        const yf = getYahooFinanceInstance();
        const searchResult = await yf.search(ticker.toUpperCase());
        const news = searchResult.news;

        if (!news || news.length === 0) {
            return { success: false, error: `No news related to "${ticker}" was found` };
        }

        const formattedNews = news.slice(0, 5).map((item: any) => ({
            title: item.title,
            publisher: item.publisher,
            link: item.link
        }));

        return { success: true, data: formattedNews };
    } catch (error: any) {
        console.error('[Company News Error]:', error.message);
        return { success: false, error: `An error occurred when checking the company news: ${error.message}` };
    }
}

// Define the function for obtaining historical stock prices
async function getStockHistory(ticker: string, days: number = 30) {
    try {
        const yf = getYahooFinanceInstance();
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const history = await yf.historical(ticker.toUpperCase(), {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });

        if (!history || history.length === 0) {
            return { success: false, error: `No historical data for "${ticker}" was found.` };
        }

        const formattedHistory = history.map((row: any) => ({
            date: row.date.toISOString().split('T')[0],
            price: parseFloat(row.close.toFixed(2)),
            open: parseFloat(row.open.toFixed(2)),
            high: parseFloat(row.high.toFixed(2)),
            low: parseFloat(row.low.toFixed(2)),
            volume: row.volume
        }));

        return {
            success: true,
            data: {
                symbol: ticker.toUpperCase(),
                period: `${days}天`,
                history: formattedHistory
            }
        };
    } catch (error: any) {
        console.error('[Stock History Error]:', error.message);
        return { success: false, error: `An error occurred when obtaining historical stock prices: ${error.message}` };
    }
}

// Define the function for predicting stock prices (Return historical data simultaneously)
async function predictStockPrice(ticker: string, days: number) {
    try {
        const yf = getYahooFinanceInstance();
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 90);

        const history = await yf.historical(ticker.toUpperCase(), {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });

        if (!history || history.length < 10) {
            return { success: false, error: `There is not enough historical data to create a predictive model for "${ticker}"` };
        }

        // Format historical data (take the most recent 30 days)
        const recentHistory = history.slice(-30).map((row: any) => ({
            date: row.date.toISOString().split('T')[0],
            price: parseFloat(row.close.toFixed(2))
        }));

        // linear regression calculation
        const n = history.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        history.forEach((row: any, i: number) => {
            const x = i;
            const y = row.close;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        if (isNaN(slope) || isNaN(intercept)) {
             return { success: false, error: "The model calculation failed, which might be due to abnormal data." };
        }

        const predictions = [];
        for (let i = 0; i < days; i++) {
            const futureX = n + i;
            const predictedPrice = slope * futureX + intercept;
            const futureDate = new Date();
            futureDate.setDate(endDate.getDate() + i + 1);
            predictions.push({
                date: futureDate.toISOString().split('T')[0],
                predictedPrice: parseFloat(predictedPrice.toFixed(2))
            });
        }

        return {
            success: true,
            data: {
                symbol: ticker.toUpperCase(),
                lastClose: history[history.length - 1].close,
                history: recentHistory,  // 添加历史数据
                predictions: predictions,
                model: 'Linear Regression'
            }
        };
    } catch (error: any) {
        console.error('[Stock Prediction Error]:', error.message);
        return { success: false, error: `An error occurred when predicting stock prices: ${error.message}` };
    }
}

// Function Calling - get stock price
const stockQuoteTool = {
    functionDeclarations: [
        {
            name: "get_stock_quote",
            description: "Obtain real-time quotation information for the specified stock code, including current price, fluctuation range, trading volume and other data. Supports stock codes of major markets such as the US stock market and the Hong Kong stock market.",
            parameters: {
                type: "object",
                properties: {
                    ticker: {
                        type: "string",
                        description: "Stock codes, such as: AAPL (Apple), TSLA (Tesla), MSFT (Microsoft), GOOGL (Google), etc"
                    }
                },
                required: ["ticker"]
            }
        }
    ]
};

//Function Calling tool - get company news
const companyNewsTool = {
    functionDeclarations: [
        {
            name: "get_company_news",
            description: "Get the latest list of company news headlines for the specified stock code, returning the news title, publisher and link.",
            parameters: {
                type: "object",
                properties: {
                    ticker: {
                        type: "string",
                        description: "Company stock codes, such as: AAPL (Apple), NVDA (NVIDIA), etc"
                    }
                },
                required: ["ticker"]
            }
        }
    ]
};

// Function Calling tool - get stock price history
const stockHistoryTool = {
    functionDeclarations: [
        {
            name: "get_stock_history",
            description: "Obtain the historical price data of the specified stock to generate a historical price trend chart. It is used when users request to view「Recent Trends」、「Historical Prices」or「price charts」.",
            parameters: {
                type: "object",
                properties: {
                    ticker: {
                        type: "string",
                        description: "Stock codes, such as: AAPL (Apple), TSLA (Tesla), etc."
                    },
                    days: {
                        type: "number",
                        description: "The default number of historical days to be queried is 30 days, and the optional range is 7 to 90 days."
                    }
                },
                required: ["ticker"]
            }
        }
    ]
};

// Function Calling tool - predict stock price
const stockPredictionTool = {
    functionDeclarations: [
        {
            name: "predict_stock_price",
            description: "Using a simple linear regression model, predict the stock price in the coming days based on the historical data of the past 90 days. At the same time, return the historical data of the last 30 days for comparison. It is used when the user requests「prediction」,「future price」or「speculation」of trend.",
            parameters: {
                type: "object",
                properties: {
                    ticker: {
                        type: "string",
                        description: "Stock codes, such as: AAPL (Apple), TSLA (Tesla), etc."
                    },
                    days: {
                        type: "number",
                        description: "The number of future days to be predicted, for example: 5."
                    }
                },
                required: ["ticker", "days"]
            }
        }
    ]
};

// Function Calling tool - Real-time monitoring of stock prices (triggering simulated emails)
const stockMonitorTool = {
    functionDeclarations: [
        {
            name: 'monitor_stock_price',
            description: 'Real-time price monitoring of designated stocks: Trigger a simulated email notification (not actually sent) when the price is above/below the threshold, or when the percentage fluctuation relative to the start exceeds the threshold. A single session can have a maximum of 3 monitors, and each monitor can last up to 30 minutes.',
            parameters: {
                type: 'object',
                properties: {
                    ticker: {
                        type: 'string',
                        description: 'Stock codes, such as: AAPL, TSLA, MSFT, etc'
                    },
                    thresholdType: {
                        type: 'string',
                        description: 'Threshold types: above (higher than), below (lower than), percentChange (relative percentage fluctuation at startup)',
                        enum: ['above', 'below', 'percentChange']
                    },
                    thresholdValue: {
                        type: 'number',
                        description: 'Threshold value. For example, "above/below" uses price (in US dollars), and "percentChange" uses percentage (for instance, 2 represents 2%).'
                    },
                    durationMinutes: {
                        type: 'number',
                        description: 'Monitoring duration (minutes), default 30, maximum 30'
                    },
                    intervalSeconds: {
                        type: 'number',
                        description: 'Polling interval (in seconds), default 30, minimum 5'
                    }
                },
                required: ['ticker', 'thresholdType', 'thresholdValue']
            }
        }
    ]
} as any;

// Handle all function calls
type ToolCall = { name: string; args: Record<string, any> };

async function handleFunctionCall(functionCall: ToolCall, ctx: { authUser: AuthUser; conversationId?: string; titleCandidate?: string }) {
    const { name, args } = functionCall;

    console.log(`[Function Call Triggered] Name: ${name}, Args:`, args);

    if (name === "get_stock_quote") {
        return await getStockQuote(args.ticker);
    }
    else if (name === "get_company_news") {
        return await getCompanyNews(args.ticker);
    }
    else if (name === "get_stock_history") {
        return await getStockHistory(args.ticker, args.days || 30);
    }
    else if (name === "predict_stock_price") {
        return await predictStockPrice(args.ticker, args.days);
    }
    else if (name === 'monitor_stock_price') {
        // Ensure conversation exists because monitoring is tied to conversation lifecycle
        let convId = ctx.conversationId;
        await dbConnect();
        if (!convId) {
            const title = (ctx.titleCandidate || 'new session').trim().slice(0, 60) || 'new session';
            const conv = await Conversation.create({ user: ctx.authUser.id, title });
            convId = String(conv._id);
        }

        const t = String(args.ticker || '').trim();
        const thresholdType = String(args.thresholdType || '').trim();
        const thresholdValue = Number(args.thresholdValue);
        const durationMinutes = args.durationMinutes ? Number(args.durationMinutes) : undefined;
        const intervalSeconds = args.intervalSeconds ? Number(args.intervalSeconds) : undefined;

        const validTypes = ['above', 'below', 'percentChange'];
        if (!t || !validTypes.includes(thresholdType) || !Number.isFinite(thresholdValue)) {
            return { success: false, error: 'Invalid argument: ticker, thresholdType(above/below/percentChange), thresholdValue is mandatory' };
        }

        const res = await startMonitor({
            conversationId: convId!,
            userId: ctx.authUser.id,
            email: ctx.authUser.email,
            ticker: t,
            rule: { type: thresholdType as ThresholdRule['type'], value: thresholdValue },
            durationMinutes,
            intervalSeconds
        });

        if (!res.success) return res;

        return {
            success: true,
            data: {
                conversationId: convId,
                taskId: res.task.id,
                ticker: res.task.ticker,
                rule: res.task.rule,
                expiresAt: res.task.expiresAt,
                note: 'The monitoring has been activated. Meeting the conditions will trigger a "simulated email" notification (which will not be actually sent). Each session has a maximum of 3 monitors, each lasting up to 30 minutes.'
            }
        };
    }

    return { success: false, error: "Unknown function call" };
}

// Input the validation function to ensure it always has a return value
function validateRequest(body: any): { valid: boolean; error?: string } {
    if (!body || typeof body.message !== 'string' || !body.message.trim()) {
        return { valid: false, error: "The message content is invalid." };
    }
    if (body.message.length > 5000) {
        return { valid: false, error: "The message is too long" };
    }
    if (body.history && !Array.isArray(body.history)) {
        return { valid: false, error: "The format of the historical record is invalid" };
    }
    return { valid: true };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = validateRequest(body);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Require auth for conversation history persistence
        const authUser = getUserFromRequest(req);
        if (!authUser) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { history, message } = body;
        let { conversationId } = body as { conversationId?: string };
        let clientHistory = history || [];

        // Check and correct the history record to ensure that the first one is the user role
        // This can prevent the initial welcome message (role: 'model') sent by the front end from causing API errors
        if (clientHistory.length > 0 && clientHistory[0].role === 'model') {
            // If the first one is a model, remove it from the history passed to the AI
            clientHistory = clientHistory.slice(1);
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [stockQuoteTool, companyNewsTool, stockHistoryTool, stockPredictionTool, stockMonitorTool] as any,
            systemInstruction: ({
                parts: [{
                    text: `You are a professional financial assistant AI Agent. You can help users look up stock information, analyze market trends, answer financial questions, and even provide price predictions based on a simple model.
Available Tools:
1. get_stock_quote: Use when the user asks for real-time stock quotes or the current price.
2. get_company_news: Use when the user asks for company news.
3. get_stock_history: [IMPORTANT] Use this tool when the user asks to see "historical performance," "recent prices," "price chart," or "trend graph," instead of predict_stock_price.
4. predict_stock_price: [FOR PREDICTION ONLY] Only use when the user explicitly asks to "predict future prices" or "forecast the trend."
5. monitor_stock_price: [REAL-TIME MONITORING] Use when the user wants to monitor a stock price in real-time and receive an alert (via a simulated email, not actually sent) when a threshold is met.
Tool Selection Criteria:
1. User says "Tesla's recent price chart" → Use get_stock_history
2. User says "Apple stock performance" → Use get_stock_history
3. User says "Predict Tesla's price next week" → Use predict_stock_price
4. User says "Will Microsoft go up in the future?" → Use predict_stock_price
5. User says "Alert me when AAPL drops below 180" or "Notify me if TSLA increases by more than 2%" → Use monitor_stock_price
Behavioral Guidelines:
1. If the user mentions a company name, automatically identify its corresponding stock ticker (e.g., "Apple" -> "AAPL", "Tesla" -> "TSLA").
2. After retrieving data, present it to the user in a friendly, professional, and clear manner.
3. [CHARTING INSTRUCTION] When the user asks to "generate a chart," "visualize," or "plot data," call the appropriate function to get the data. After successfully fetching the data, your final response should be a short confirmation message like "Okay, the chart has been generated. You can click here to view the chart." and must include a Markdown link to /visualization.
4. [DISCLAIMER] When you use the predict_stock_price function, you must include the following disclaimer at the beginning or end of your response: "Please note: The following prediction is based on a simplified linear regression model and is derived solely from historical data. It does not constitute any investment advice. The real market is influenced by multiple complex factors and carries high risk."
5. [MONITORING DETAILS] Monitoring lasts for a maximum of 30 minutes; a maximum of 3 monitoring tasks can be created per session; the "simulated email" is sent only once upon triggering (it is only logged in the system and not actually sent).
Common Stock Ticker Reference:
Apple: AAPL
Tesla: TSLA
Microsoft: MSFT
Google: GOOGL
Amazon: AMZN
Meta: META
Nvidia: NVDA`
                }]
            }) as any
        });

        const chat = model.startChat({ history: clientHistory});

        let result = await chat.sendMessage(message);
        let response = result.response;


        let functionCallResult: { name: string; data: any } | null = null;
        let functionCallCount = 0;
        const maxFunctionCalls = 5;

        while (response.functionCalls() && functionCallCount < maxFunctionCalls) {
            functionCallCount++;
            const functionCalls = response.functionCalls()!;
            
            console.log(`[Agent] Processing ${functionCalls.length} function call(s)`);

            const functionResponses = await Promise.all(
                functionCalls.map(async (call: ToolCall) => {
                    // Execute the call and store the result
                    const callResult = await handleFunctionCall(call, { authUser, conversationId, titleCandidate: (message as string) });
                    // If monitor tool created a conversation, adopt it for this request lifecycle
                    if (call.name === 'monitor_stock_price' && callResult && (callResult as any).success) {
                        const d = (callResult as any).data;
                        if (!conversationId && d && d.conversationId) {
                            conversationId = d.conversationId;
                        }
                    }
                    // Store the first successful function call result for potential use in final response generation
                    if (callResult.success && !functionCallResult) {
                        functionCallResult = {
                            name: call.name,
                            data: callResult.data
                        };
                    }
                    return {
                        functionResponse: {
                            name: call.name,
                            response: callResult
                        }
                    };
                })
            );

            result = await chat.sendMessage(functionResponses);
            response = result.response;
        }

        let finalText = response.text();
        
        // Ensure or create conversation
        if (!conversationId) {
            const title = (message as string).trim().slice(0, 60) || 'new session';
            const conv = await Conversation.create({ user: authUser.id, title });
            conversationId = String(conv._id);
        } else {
            const existing = await Conversation.findOne({ _id: conversationId, user: authUser.id });
            if (!existing) {
                // If provided conversationId is invalid or not owned by user, create a new one
                const title = (message as string).trim().slice(0, 60) || 'new session';
                const conv = await Conversation.create({ user: authUser.id, title });
                conversationId = String(conv._id);
            } else {
                // Touch updatedAt
                await Conversation.updateOne({ _id: conversationId, user: authUser.id }, { $set: { updatedAt: new Date() } });
            }
        }

        // Generate a default final text if none is produced
        if (!finalText || !String(finalText).trim()) {
            if (functionCallResult?.name === 'monitor_stock_price') {
                try {
                    const d: any = functionCallResult.data || {};
                    const rule = d.rule ? (typeof d.rule === 'string' ? d.rule : `${d.rule.type} ${d.rule.value}`) : '';
                    const ticker = d.ticker || '';
                    const exp = d.expiresAt ? new Date(d.expiresAt).toLocaleString() : '';
                    finalText = `Monitoring has been activated: ${ticker}(rule: ${rule})。It will be notified in the form of a "simulated email" after being triggered. Valid until: ${exp}`;
                } catch {
                    finalText = 'The tool call has been completed and the operation has been finished.';
                }
            } else if (functionCallCount > 0) {
                finalText = 'The tool call has been completed and the operation has been finished.';
            } else {
                finalText = '';
            }
        }

        // Persist messages
        try {
            await Message.create([
                { conversation: conversationId, role: 'user', content: message },
                { conversation: conversationId, role: 'model', content: finalText }
            ]);
        } catch (persistErr) {
            console.error('[Chat Persistence] Failed to save messages:', persistErr);
        }
        
        console.log(`[Agent] Final response generated after ${functionCallCount} function call(s)`);

        // 1. The original history received from the client
        const originalHistory = history || [];

        // 2. Add the user's message
        const userMessagePart = {
            role: "user",
            parts: [{ text: message }],
        };

        // 3. Add the model's response
        const modelResponsePart = {
            role: "model",
            parts: [{ text: finalText }],
        };

        // 4. Construct the new history array
        const newHistory = [
            ...originalHistory,
            userMessagePart,
            modelResponsePart
        ];
        
        // Return the final response along with the updated history
        return NextResponse.json({ 
            reply: finalText,
            history: newHistory,
            functionCallCount: functionCallCount,
            functionCallResult: functionCallResult,
            conversationId
        });

    } catch (error: any) {
        console.error("[API Error]", error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: "Request format error" }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
