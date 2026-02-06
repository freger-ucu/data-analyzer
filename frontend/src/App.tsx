import { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, TableProperties, BarChart3, X, FileText } from "lucide-react";
import { DataTab } from "./components/DataTab";
import { PlotsTab } from "./components/PlotsTab";

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[18px] overflow-hidden flex flex-col h-full ${className || ""}`}>
      {/* Background fill */}
      <div className="absolute inset-0 rounded-[18px]">
        <div className="absolute inset-0 pointer-events-none rounded-[18px]">
          <div className="absolute bg-[#262626] inset-0 mix-blend-color-dodge rounded-[18px]" />
          <div className="absolute bg-[rgba(245,245,245,0.67)] inset-0 rounded-[18px]" />
        </div>
      </div>
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0 w-full">{children}</div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"data" | "plots">("data");
  const [chatInput, setChatInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<
    { id: number; role: "user" | "assistant"; text: string; fileName?: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasContent = chatInput.trim().length > 0 || attachedFile !== null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!hasContent) return;

    const userMessage = {
      id: Date.now(),
      role: "user" as const,
      text: chatInput.trim() || `Attached file`,
      fileName: attachedFile?.name,
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setAttachedFile(null);

    // Simulate assistant response
    setTimeout(() => {
      const responses = [
        "I've analyzed the data. The temperature column shows a clear seasonal trend with an average of 36.1°F across the dataset.",
        "Based on the CSV, humidity and pressure have an inverse correlation (r = -0.72). Would you like me to generate a plot?",
        "The wind speed data has 3 outliers above 15 mph. I'd recommend filtering those for a cleaner analysis.",
        "I can see 20 rows and 5 columns in your dataset: date, temperature, humidity, windSpeed, and pressure.",
        "The data spans from January 1-20, 2018. Temperature ranges from 27°F to 46°F during this period.",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", text: response },
      ]);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="bg-white flex gap-2.5 items-stretch p-2.5 fixed inset-0 overflow-hidden">
      {/* Left sidebar */}
      <div className="flex flex-col gap-2.5 w-[340px] shrink-0 h-full min-w-0">
        {/* Tab bar */}
        <GlassPanel className="shrink-0">
          <div className="flex items-center py-2.5 px-2.5">
            <button
              onClick={() => setActiveTab("data")}
              className={`flex-1 h-[24px] flex items-center justify-center gap-1.5 rounded-lg px-2 transition-colors ${activeTab === "data" ? "bg-black/10" : ""
                }`}
            >
              <TableProperties className="w-[14px] h-[14px] text-[rgba(0,0,0,0.85)]" />
              <span
                className="text-[11px] text-[rgba(0,0,0,0.85)]"
                style={{ fontWeight: 510 }}
              >
                Data
              </span>
            </button>
            <button
              onClick={() => setActiveTab("plots")}
              className={`flex-1 h-[24px] flex items-center justify-center gap-1.5 rounded-lg px-2 transition-colors ${activeTab === "plots" ? "bg-black/10" : ""
                }`}
            >
              <BarChart3 className="w-[14px] h-[14px] text-[rgba(0,0,0,0.85)]" />
              <span
                className="text-[11px] text-[rgba(0,0,0,0.85)]"
                style={{ fontWeight: 510 }}
              >
                Plots
              </span>
            </button>
          </div>
        </GlassPanel>

        {/* Content panel */}
        <GlassPanel className="flex-1">
          <div className="h-full overflow-auto">
            {activeTab === "data" ? <DataTab /> : <PlotsTab />}
          </div>
        </GlassPanel>
      </div>

      {/* Right panel */}
      <GlassPanel className="flex-1">
        <div className="flex flex-col h-full py-3.5">
          {/* Title */}
          <div className="px-5">
            <h2
              className="text-[18px] text-[rgba(0,0,0,0.85)]"
              style={{ fontWeight: 590 }}
            >
              CSV Analyzer
            </h2>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[13px] text-[#8E8E93]" style={{ fontWeight: 510 }}>
                  Ask a question about your data
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
                          ? "bg-black text-white"
                          : "bg-white shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]"
                        }`}
                    >
                      {msg.fileName && (
                        <div
                          className={`flex items-center gap-1.5 mb-1.5 text-[11px] ${msg.role === "user" ? "text-white/70" : "text-[#8E8E93]"
                            }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{msg.fileName}</span>
                        </div>
                      )}
                      <p
                        className={`text-[13px] ${msg.role === "user" ? "text-white" : "text-[rgba(0,0,0,0.85)]"
                          }`}
                        style={{ fontWeight: 400 }}
                      >
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Attached file indicator */}
          {attachedFile && (
            <div className="px-5 pb-2">
              <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
                <FileText className="w-3.5 h-3.5 text-[#08f]" />
                <span className="text-[12px] text-[rgba(0,0,0,0.85)]" style={{ fontWeight: 510 }}>
                  {attachedFile.name}
                </span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
                >
                  <X className="w-2.5 h-2.5 text-[rgba(0,0,0,0.6)]" />
                </button>
              </div>
            </div>
          )}

          {/* Ask anything input */}
          <div className="px-5 shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Input field */}
              <div className="flex-1 flex items-center gap-0.5 bg-white rounded-full px-6 py-2.5 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)]">
                <input
                  type="text"
                  placeholder="Ask anything"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-[13px] text-[#4c4c4c] outline-none placeholder:text-[#4c4c4c]"
                  style={{ fontWeight: 510 }}
                />
                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!hasContent}
                  className={`w-[36px] h-[36px] rounded-full flex items-center justify-center relative overflow-hidden shrink-0 transition-all duration-200 ${hasContent ? "cursor-pointer" : "cursor-default"
                    }`}
                >
                  <div className="absolute inset-0 rounded-full">
                    <div
                      className={`absolute inset-0 rounded-full transition-colors duration-200 ${hasContent ? "bg-black" : "bg-[#f7f7f7]"
                        }`}
                    />
                  </div>
                  <ArrowUp
                    className={`w-[15px] h-[15px] relative z-10 transition-colors duration-200 ${hasContent ? "text-white" : "text-[#8E8E93]"
                      }`}
                  />
                </button>
              </div>

              {/* Attachment button */}
              <button
                onClick={handleFileAttach}
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center relative overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity outline-none focus:outline-none"
              >
                <div className="absolute inset-0 rounded-full">
                  <div className={`absolute inset-0 rounded-full transition-colors duration-200 ${attachedFile ? "bg-[#08f]" : "bg-[#f7f7f7]"
                    }`} />
                </div>
                <Paperclip className={`w-[15px] h-[15px] relative z-10 transition-colors duration-200 ${attachedFile ? "text-white" : "text-[#8E8E93]"
                  }`} />
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}