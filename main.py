import os
import yfinance as yf
import google.generativeai as genai
from dotenv import load_dotenv

# set up environment variables and configure API key

# get API key from environment variable
load_dotenv()


api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("Please ensure that the 'GOOGLE_API_KEY' environment variable is set in the.env file")
genai.configure(api_key=api_key)


# define the tool that fetches stock prices

def get_stock_price(ticker_symbol: str) -> float:

    print(f"--- The tool is being executed: get_stock_price(ticker_symbol='{ticker_symbol}') ---")
    try:
        stock = yf.Ticker(ticker_symbol)
        # get historical market data for the last day
        history = stock.history(period='1d')
        if history.empty:
            return f"errir: cant find the data of stock code '{ticker_symbol}'."
        # return the closing price of the last trading day
        return history['Close'].iloc[-1]
    except Exception as e:
        return f"An error occurred during the query: {e}"

# -- 3. Initialize the Gemini model and inform it how powerful our tool is --
# Provide the functions we defined as "tools" to the model
#The 'google-generativeai' library automatically converts function signatures into a format that the model can understand
model = genai.GenerativeModel(
    model_name='gemini-2.5-pro',
    tools=[get_stock_price]  
)

# Start a chat session with automatic function calling enabled
chat = model.start_chat(enable_automatic_function_calling=True)

# -- 4. Start a conversation loop --

print("The chatbot has been activated! You can ask me about the stock price (for example: 'What is the share price of Apple?') To end the conversation, type 'Exit'.")

while True:
    user_prompt = input("you: ")
    if user_prompt.lower() == 'exit':
        print("bye!")
        break

    # Send the user's message to the model
    response = chat.send_message(user_prompt)

    # Display the model's response
    print(f"Gemini: {response.text}\n")