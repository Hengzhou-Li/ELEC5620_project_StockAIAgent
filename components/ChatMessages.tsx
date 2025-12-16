// components/ChatMessages.tsx
import { useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';
import { ApiHistoryPart } from '@/store/chartStore';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

interface ChatMessagesProps {
  history: ApiHistoryPart[];
  isLoading: boolean;
}

export default function ChatMessages({ history, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [history, isLoading]);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {history.map((msg, index) => (
        <div key={`${index}-${msg.role}-${msg.parts?.[0]?.text?.length || 0}`} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          
          {msg.role === 'model' && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-slate-300" />
            </div>
          )}

          <div
            // Conditional styling based on message role
            className={`max-w-md px-4 py-3 rounded-2xl shadow-md ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-slate-700 text-slate-200 rounded-bl-none'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap prose prose-invert prose-p:my-0 prose-a:text-blue-400 hover:prose-a:underline">
              <ReactMarkdown
                components={{
                  a: ({ node, ...props }) => (
                    <Link href={props.href || ''}>
                      {props.children}
                    </Link>
                  )
                }}
              >
                {msg.parts[0].text}
              </ReactMarkdown>
            </div>
          </div>

          {msg.role === 'user' && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center shadow-md">
              <User className="w-6 h-6 text-slate-300" />
            </div>
          )}
        </div>
      ))}
      
      {isLoading && (
         <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-slate-300" />
          </div>
          <div className="max-w-md px-4 py-3 rounded-2xl bg-slate-700 rounded-bl-none shadow-md">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
