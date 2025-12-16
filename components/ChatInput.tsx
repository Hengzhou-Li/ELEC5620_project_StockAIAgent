// components/ChatInput.tsx
import { useState } from 'react';
import { SendHorizonal } from 'lucide-react'; 

interface ChatInputProps {
  onSendMessage: (input: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="p-4 border-t border-gray-700 bg-[#111827] rounded-b-lg">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Please enter your question, for example: Analyzing the price-earnings ratio of AAPL..."
          className="flex-1 w-full px-4 py-2 bg-gray-700 text-gray-200 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="p-2 text-white bg-green-600 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
          disabled={isLoading || !input.trim()}
        >
          <SendHorizonal className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}