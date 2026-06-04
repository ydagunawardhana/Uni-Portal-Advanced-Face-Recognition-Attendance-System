import { useState, useRef, useEffect } from "react";
import {
  Search,
  Camera,
  LogIn,
  User,
  ChevronDown,
  Mail,
  Phone,
  HelpCircle,
  Clock,
  Send,
} from "lucide-react";
import { API_BASE_URL } from "../config";

interface AccordionItem {
  question: string;
  answer: string;
}

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
}

export default function StudentHelpSupport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  // --- Integrated Chatbot Logic ---
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const savedMessages = localStorage.getItem("support_chatbot_history");
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages);
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    }
    // Default initial state if nothing is in local storage
    return [
      {
        sender: "bot",
        text: "Hello! I am your AI Support Assistant. How can I help you with your attendance or portal access today?",
      },
    ];
  });
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messages.length > 1 || isTyping) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("support_chatbot_history", JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    const userMsg: ChatMessage = { sender: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch(API_BASE_URL + "/api/chatbot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await response.json();

      // Natural typing delay
      setTimeout(() => {
        const botMsg: ChatMessage = {
          sender: "bot",
          text:
            data.reply ||
            "I'm sorry, I'm having trouble processing that right now.",
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 1500);
    } catch (error) {
      setIsTyping(false);
      const errorMsg: ChatMessage = {
        sender: "bot",
        text: "Support server is currently unavailable. Please try again later.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const faqCategories = [
    {
      title: "Attendance Issues",
      icon: Camera,
      description: "Camera detection, Absent marking",
      questions: 5,
      color: "bg-red-100 dark:bg-red-900/20 text-red-600",
    },
    {
      title: "Login Problems",
      icon: LogIn,
      description: "Password reset, Access issues",
      questions: 4,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Profile Updates",
      icon: User,
      description: "Face re-training, Personal info",
      questions: 3,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const popularQuestions: AccordionItem[] = [
    {
      question: "How do I request an attendance correction?",
      answer:
        'Go to "Request Correction" in the sidebar menu. Fill out the form with the date, class details, and reason for correction. Attach any supporting documents if needed. Your lecturer will review and approve the request within 2-3 business days.',
    },
    {
      question: "What should I do if the camera doesn't recognize me?",
      answer:
        "Ensure proper lighting and look directly at the camera. Clean your camera lens. If issues persist, go to My Profile > Face Recognition Settings > Retrain Face. Follow the on-screen instructions to capture new face data.",
    },
    {
      question: "How can I reset my password?",
      answer:
        'Click "Forgot Password?" on the login page. Enter your university email. You\'ll receive a reset link within 5 minutes. Click the link and create a new password. Use at least 8 characters with uppercase, lowercase, and numbers.',
    },
    {
      question: "Why is my attendance showing as absent when I was present?",
      answer:
        "This can happen due to face recognition errors or network issues. Check if you marked both entry and exit. If the issue persists, submit a correction request with details of the class. Include any screenshots or proof of attendance.",
    },
    {
      question: "How do I update my profile picture?",
      answer:
        'Navigate to My Profile from the sidebar. Click on your current profile picture. Upload a new photo (JPEG/PNG, max 5MB). Crop and adjust as needed. Click "Save Changes" to update your profile picture.',
    },
  ];

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-800 min-h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Merged Hero & Chatbot Section */}
      <div className="bg-red-50 dark:bg-gray-800/50 rounded-2xl p-8 mb-10 flex flex-col items-center border border-red-100 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
        {/* Header Info */}
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white mb-5 shadow-lg">
          <HelpCircle className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
          How can we help?
        </h2>
        <p className="text-gray-700 dark:text-gray-400 mb-8 text-center max-w-lg">
          Ask our AI Assistant for instant answers or browse the help topics
          below
        </p>

        {/* Chat Interface Container - Enforcing max-width for alignment */}
        <div className="w-full">
          {/* Dynamic Height Container - Using Inline Styles for Guaranteed Constraints */}
          <div
            className="px-4 pb-4 flex flex-col gap-4 custom-scrollbar"
            style={{ maxHeight: "400px", overflowY: "auto" }}
          >
            {messages.map((msg, idx) => (
              <div key={idx} className="flex flex-col">
                {/* Chat Bubble */}
                <div
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm font-semibold leading-relaxed max-w-[85%] shadow-md ${
                      msg.sender === "user"
                        ? "bg-red-600 rounded-2xl text-white font-semibold"
                        : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Suggestion Chips (Only under the first greeting) */}
                {idx === 0 && messages.length === 1 && (
                  <div className="flex flex-wrap gap-2 mt-4 mb-2 ml-2 animate-in fade-in slide-in-from-left-4 duration-500 delay-300">
                    <button
                      onClick={() =>
                        setInputValue(
                          "How do I request an attendance correction?"
                        )
                      }
                      className="text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-gray-400 px-4 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 hover:text-red-600 transition-all shadow-sm cursor-pointer"
                    >
                      Attendance Correction
                    </button>
                    <button
                      onClick={() =>
                        setInputValue(
                          "My camera is not working, what should I do?"
                        )
                      }
                      className="text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-gray-400 px-4 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 hover:text-red-600 transition-all shadow-sm cursor-pointer"
                    >
                      System Error
                    </button>
                    <button
                      onClick={() =>
                        setInputValue("How can I check my attendance history?")
                      }
                      className="text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-gray-400 px-4 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 hover:text-red-600 transition-all shadow-sm cursor-pointer"
                    >
                      Check History
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start mb-2">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl rounded-tl-sm flex gap-2 items-center max-w-[85%] shadow-sm">
                  <div
                    className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Added shrink-0 to prevent flex squishing */}
          <div className="mt-4 flex bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-100 dark:border-gray-700 p-1.5 mx-4 shrink-0">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 px-6 py-3 outline-none text-sm bg-transparent rounded-l-full dark:text-white"
              placeholder="Type your question here..."
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50 text-white px-8 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Grid */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
          Browse by Topic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {faqCategories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <button
                key={index}
                className="bg-white dark:bg-gray-800 cursor-pointer border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-red-300 hover:shadow-lg transition-all duration-300 text-left group"
              >
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 ${category.color} rounded-xl mb-4 group-hover:scale-110 transition-transform`}
                >
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {category.description}
                </p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <HelpCircle className="w-4 h-4 mr-1" />
                  {category.questions} articles
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Popular Questions */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {popularQuestions.map((item, index) => (
            <div
              key={index}
              className="border-2 border-gray-200 cursor-pointer dark:border-gray-700 rounded-xl overflow-hidden hover:border-red-200 transition-colors"
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full flex items-center cursor-pointer justify-between p-5 hover:bg-gray-50 dark:bg-gray-700 transition-colors text-left"
              >
                <span className="font-semibold text-gray-900 dark:text-white pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-red-600 flex-shrink-0 transition-transform duration-200 ${
                    openAccordion === index ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {openAccordion === index && (
                <div className="px-5 pb-5 pt-0 text-gray-700 dark:text-gray-300 leading-relaxed bg-red-50 dark:bg-red-900/20/30 border-t border-gray-200 dark:border-gray-700">
                  <p className="pt-4">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border-2 border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Still need assistance?
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Our support team is ready to help you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Email Support */}
            <div className="bg-red-50 dark:bg-gray-800 rounded-xl p-6 text-center border-2 border-red-200 dark:border-gray-700 hover:border-red-300 hover:shadow-md transition-all">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Email Support
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Response within 24 hours
              </p>
              <a
                href="mailto:student.support@university.edu"
                className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium text-sm hover:underline"
              >
                student.support@university.edu
              </a>
            </div>

            {/* Hotline */}
            <div className="bg-green-50 dark:bg-gray-800 rounded-xl p-6 text-center border-2 border-green-200 dark:border-green-700 hover:border-green-500 hover:shadow-md transition-all">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Student Hotline
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Mon-Fri, 9 AM - 5 PM
              </p>
              <a
                href="tel:+15551234567"
                className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium text-sm hover:underline"
              >
                +1 (555) 123-4567
              </a>
            </div>

            {/* Office Hours */}
            <div className="bg-blue-50 dark:bg-gray-800 rounded-xl p-6 text-center border-2 border-blue-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Visit Help Desk
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Student Affairs Office
              </p>
              <p className="text-blue-600 font-medium text-sm">
                Building A, Room 101
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
