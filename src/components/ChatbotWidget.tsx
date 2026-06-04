import { useState, useRef, useEffect } from "react";
import { X, Send, Bot } from "lucide-react";
import { API_BASE_URL } from "../config";

interface ChatbotWidgetProps {
  onClose: () => void;
}

interface Message {
  id: number;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
}

export default function ChatbotWidget({ onClose }: ChatbotWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I am your virtual assistant. How can I help you with your attendance today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const quickActions = [
    "Attendance Correction",
    "System Error",
    "Contact Admin",
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (inputValue.trim()) {
      const userText = inputValue;
      const newMessage: Message = {
        id: messages.length + 1,
        text: userText,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInputValue("");
      setIsTyping(true);

      try {
        const response = await fetch(API_BASE_URL + "/api/chatbot/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userText }),
        });

        const data = await response.json();

        // Simulate natural typing delay (min 1 second)
        setTimeout(() => {
          const botResponse: Message = {
            id: messages.length + 2,
            text:
              data.reply ||
              "I'm sorry, I encountered an error processing your request.",
            sender: "bot",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botResponse]);
          setIsTyping(false);
        }, 2500);
      } catch (error) {
        console.error("Chatbot API Error:", error);
        const errorResponse: Message = {
          id: messages.length + 2,
          text: "I'm having trouble connecting to the support server. Please try again later.",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorResponse]);
        setIsTyping(false);
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      text: action,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages([...messages, newMessage]);
    setIsTyping(true);

    try {
      const response = await fetch(API_BASE_URL + "/api/chatbot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: action }),
      });

      const data = await response.json();

      // Simulate natural typing delay
      setTimeout(() => {
        const botResponse: Message = {
          id: messages.length + 2,
          text: data.reply,
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
        setIsTyping(false);
      }, 2500);
    } catch (error) {
      const errorResponse: Message = {
        id: messages.length + 2,
        text: "Support server is currently unavailable.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 animate-pulse rounded-full flex items-center justify-center">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-semibold text-base">
              Attendance Support Assistant
            </h3>
            <p className="text-sm text-blue-200 font-bold">Online</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-white/10 p-1.5 rounded-full cursor-pointer transition-colors"
          aria-label="Close chatbot"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-200 text-gray-800 rounded-bl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>

            {/* Show quick actions only after the first bot message */}
            {message.sender === "bot" && index === 0 && (
              <div className="flex flex-wrap gap-2 mt-3 ml-1">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className="px-4 py-2 bg-white border cursor-pointer border-gray-300 rounded-full text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start mb-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="bg-gray-200 p-3 rounded-2xl rounded-bl-none flex gap-1 items-center max-w-[85%]">
              <div
                className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your question..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 text-white p-3 cursor-pointer rounded-full hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!inputValue.trim()}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
