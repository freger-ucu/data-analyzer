import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, TableProperties, BarChart3, FileText, Loader2, Upload, SquarePen, X } from "lucide-react";
import { DataTab } from "./components/DataTab";
import { PlotsTab, PlotData } from "./components/PlotsTab";
import { MarkdownLatex } from "./components/MarkdownLatex";
import { Chart, ChartConfig } from "./components/Chart";

interface FileInfo {
  filename: string;
  row_count: number;
  column_count: number;
  columns: string[];
  preview: Record<string, unknown>[];
}

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  text: string;
  fileName?: string;
  plotPath?: string;
  plotTitle?: string;
  chartConfig?: ChartConfig;
  chartData?: Record<string, unknown>[];
}

function GlassPanel({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative rounded-[18px] overflow-hidden flex flex-col ${className || ""}`}
      style={{
        minHeight: 0,
        backgroundColor: '#1e1b2e',
        border: '1px solid rgba(147,51,234,0.2)',
        ...style,
      }}
    >
      {/* Top gradient glow */}
      <div className="absolute inset-x-0 top-0 h-[80px] pointer-events-none" style={{
        background: 'linear-gradient(180deg, rgba(147,51,234,0.18) 0%, rgba(147,51,234,0.06) 40%, transparent 100%)',
      }} />
      {/* Side gradient glows */}
      <div className="absolute inset-y-0 left-0 w-[50px] pointer-events-none" style={{
        background: 'linear-gradient(90deg, rgba(147,51,234,0.08) 0%, transparent 100%)',
      }} />
      <div className="absolute inset-y-0 right-0 w-[50px] pointer-events-none" style={{
        background: 'linear-gradient(270deg, rgba(147,51,234,0.08) 0%, transparent 100%)',
      }} />
      {/* Bottom subtle glow */}
      <div className="absolute inset-x-0 bottom-0 h-[40px] pointer-events-none" style={{
        background: 'linear-gradient(0deg, rgba(147,51,234,0.06) 0%, transparent 100%)',
      }} />
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col w-full" style={{ minHeight: 0, overflow: 'hidden', height: '100%' }}>{children}</div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"data" | "plots">("data");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [plots, setPlots] = useState<PlotData[]>([]);
  const [fullscreenPlot, setFullscreenPlot] = useState<{ title: string; chartConfig: ChartConfig; chartData: Record<string, unknown>[] } | null>(null);
  const [dataVersion, setDataVersion] = useState<"current" | "original">("current");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ text: string; category: string }[]>([]);
  const [showFullData, setShowFullData] = useState(false);
  const [fullDataRows, setFullDataRows] = useState<Record<string, unknown>[] | null>(null);
  const [fullDataLoading, setFullDataLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const hasContent = chatInput.trim().length > 0;

  // Close fullscreen data on Escape
  useEffect(() => {
    if (!showFullData) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFullData(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFullData]);

  // Fetch all data rows when fullscreen modal opens
  useEffect(() => {
    if (!showFullData || !sessionId) {
      if (!showFullData) setFullDataRows(null);
      return;
    }
    setFullDataLoading(true);
    fetch(`http://localhost:8001/api/preview/${sessionId}?rows=99999&version=${dataVersion}`)
      .then(res => res.json())
      .then(data => {
        setFullDataRows(data.preview);
        setFullDataLoading(false);
      })
      .catch(() => setFullDataLoading(false));
  }, [showFullData, sessionId, dataVersion]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Restore session from backend on mount
  useEffect(() => {
    const initSession = async () => {
      const savedSessionId = localStorage.getItem("csv_analyzer_session_id");

      if (savedSessionId) {
        // Try to restore existing session from backend
        try {
          // Check if session exists and has file
          const sessionResponse = await fetch(`/api/session/${savedSessionId}`);
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();

            if (sessionData.session) {
              setSessionId(savedSessionId);

              // Restore file info if session has file
              if (sessionData.has_file && sessionData.session) {
                setFileInfo({
                  filename: sessionData.session.filename,
                  row_count: sessionData.session.row_count,
                  column_count: sessionData.session.column_count,
                  columns: sessionData.session.columns,
                  preview: [], // Will load preview separately if needed
                });

                // Load full preview
                const previewResponse = await fetch(`/api/preview/${savedSessionId}`);
                if (previewResponse.ok) {
                  const previewData = await previewResponse.json();
                  setFileInfo({
                    filename: previewData.filename,
                    row_count: previewData.row_count,
                    column_count: previewData.column_count,
                    columns: previewData.columns,
                    preview: previewData.preview,
                  });
                }
              }

              // Load chat history - try backend first, then localStorage fallback
              let messagesRestored = false;
              try {
                const historyResponse = await fetch(`/api/chat/${savedSessionId}/history`);
                if (historyResponse.ok) {
                  const historyData = await historyResponse.json();
                  if (historyData.messages && historyData.messages.length > 0) {
                    const restoredMessages: Message[] = historyData.messages.map((msg: {
                      id: number;
                      role: string;
                      text: string;
                      type?: string;
                      plot_path?: string;
                      plot_title?: string;
                      plot_data?: { chart_config?: ChartConfig; chart_data?: Record<string, unknown>[] };
                    }) => ({
                      id: msg.id,
                      role: msg.role as "user" | "assistant" | "system",
                      text: msg.text,
                      plotPath: msg.plot_path,
                      plotTitle: msg.plot_title,
                      chartConfig: msg.plot_data?.chart_config,
                      chartData: msg.plot_data?.chart_data,
                    }));
                    setMessages(restoredMessages);
                    messagesRestored = true;
                  }
                }
              } catch {
                console.log("Failed to load from backend, trying localStorage");
              }

              // Fallback to localStorage if backend failed
              if (!messagesRestored) {
                const savedMessages = localStorage.getItem(`chat_messages_${savedSessionId}`);
                if (savedMessages) {
                  try {
                    const parsed = JSON.parse(savedMessages);
                    setMessages(parsed);
                  } catch {
                    console.log("Failed to parse localStorage messages");
                  }
                }
              }

              // Load plots from backend
              const plotsResponse = await fetch(`/api/plots/${savedSessionId}`);
              if (plotsResponse.ok) {
                const plotsData = await plotsResponse.json();
                if (plotsData.plots && plotsData.plots.length > 0) {
                  const restoredPlots: PlotData[] = plotsData.plots.map((plot: { id: string; title: string; columns_used: string; summary?: string; path?: string; chart_config?: ChartConfig; chart_data?: Record<string, unknown>[] }) => ({
                    id: parseInt(plot.id) || Date.now(),
                    title: plot.title,
                    columnsUsed: plot.columns_used || "",
                    summary: plot.summary || "",
                    insights: "",
                    chartConfig: plot.chart_config,
                    chartData: plot.chart_data,
                  }));
                  setPlots(restoredPlots);
                }
              }

              return;
            }
          }
        } catch {
          // Session expired or error, try localStorage fallback
          console.log("Session restore failed, checking localStorage");
          const savedMessages = localStorage.getItem(`chat_messages_${savedSessionId}`);
          if (savedMessages) {
            try {
              setSessionId(savedSessionId);
              setMessages(JSON.parse(savedMessages));
              return;
            } catch {
              console.log("Failed to parse localStorage messages");
            }
          }
        }
      }

      // Create new session
      try {
        const response = await fetch("/api/session", { method: "POST" });
        const data = await response.json();
        setSessionId(data.session_id);
        localStorage.setItem("csv_analyzer_session_id", data.session_id);
      } catch (error) {
        console.error("Failed to create session:", error);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // New chat handler
  const handleNewChat = async () => {
    // Clear localStorage for old session
    if (sessionId) {
      localStorage.removeItem(`chat_messages_${sessionId}`);
    }
    localStorage.removeItem("csv_analyzer_session_id");

    // Reset state
    setMessages([]);
    setFileInfo(null);
    setChatInput("");
    setPlots([]);
    setDataVersion("current");

    // Create new session
    try {
      const response = await fetch("/api/session", { method: "POST" });
      const data = await response.json();
      setSessionId(data.session_id);
      localStorage.setItem("csv_analyzer_session_id", data.session_id);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  // Save message to backend
  const saveMessageToBackend = async (role: string, text: string, messageType: string = "text") => {
    if (!sessionId) return;
    try {
      await fetch(`/api/chat/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, text, message_type: messageType }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  // Upload file to backend
  const uploadFile = async (file: File): Promise<boolean> => {
    if (!sessionId) return false;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/upload/${sessionId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data = await response.json();
      setFileInfo({
        filename: data.filename,
        row_count: data.row_count,
        column_count: data.column_count,
        columns: data.columns,
        preview: data.preview,
      });

      return true;
    } catch (error) {
      console.error("Upload failed:", error);
      return false;
    }
  };

  // Send chat message via SSE stream
  const sendChatMessage = async (message: string): Promise<void> => {
    if (!sessionId) return;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Chat failed");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ") && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(currentEvent, data);
          } catch {
            // Ignore parse errors
          }
          currentEvent = "";
        }
      }
    }
  };

  // Handle SSE events from planner
  const handleSSEEvent = (eventType: string, data: Record<string, unknown>) => {
    switch (eventType) {
      case "text":
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "assistant",
            text: data.text as string,
          },
        ]);
        break;

      case "plot":
        // Add plot to plots array
        const plotData: PlotData = {
          id: Date.now(),
          title: data.title as string,
          columnsUsed: (data.columns_used as string) || "",
          summary: (data.summary as string) || "",
          insights: "",
          chartConfig: data.chart_config as ChartConfig | undefined,
          chartData: data.chart_data as Record<string, unknown>[] | undefined,
        };
        setPlots((prev) => [...prev, plotData]);

        // Add inline plot message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "system",
            text: data.title as string,
            plotTitle: data.title as string,
            chartConfig: data.chart_config as ChartConfig | undefined,
            chartData: data.chart_data as Record<string, unknown>[] | undefined,
          },
        ]);
        break;

      case "query_result":
        // Log errors to console only, don't show to user
        if (data.is_error) {
          console.error("[Query Error]", data.result);
        }
        break;

      case "error":
        // Log errors to console only, don't show to user
        console.error("[Chat Error]", data.message);
        break;

      case "status":
        setStatusMessage(data.message as string);
        break;

      case "done":
        setStatusMessage(null);
        // Refresh data if updated
        if (data.data_updated) {
          refreshFileInfo();
        }
        break;
    }
  };

  // Refresh file info after transformation
  const refreshFileInfo = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/preview/${sessionId}?version=current`);
      if (response.ok) {
        const data = await response.json();
        // Only update if viewing current version
        if (dataVersion === "current") {
          setFileInfo({
            filename: data.filename,
            row_count: data.row_count,
            column_count: data.column_count,
            columns: data.columns,
            preview: data.preview,
          });
        }
      }
    } catch (error) {
      console.error("Failed to refresh file info:", error);
    }
  };

  // Switch between original and current version
  const switchVersion = async (version: "current" | "original") => {
    if (!sessionId) return;
    setDataVersion(version);

    try {
      const response = await fetch(`/api/preview/${sessionId}?version=${version}`);
      if (response.ok) {
        const data = await response.json();
        setFileInfo({
          filename: data.filename,
          row_count: data.row_count,
          column_count: data.column_count,
          columns: data.columns,
          preview: data.preview,
        });
      }
    } catch (error) {
      console.error("Failed to switch version:", error);
    }
  };

  // Auto-upload file when attached
  const handleFileUpload = async (file: File) => {
    if (!sessionId || isLoading) return;

    setIsLoading(true);

    // Add user message locally and persist to backend
    const userMessageText = `Uploaded file: ${file.name}`;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        text: "Uploaded file",
        fileName: file.name,
      },
    ]);
    await saveMessageToBackend("user", userMessageText);

    const uploaded = await uploadFile(file);

    if (uploaded) {
      // Need to get fresh row count from response
      const response = await fetch(`/api/preview/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setFileInfo({
          filename: data.filename,
          row_count: data.row_count,
          column_count: data.column_count,
          columns: data.columns,
          preview: data.preview,
        });

        // Auto-request data summary from the Planner
        try {
          await sendChatMessage(`Summarize this dataset: ${data.filename} (${data.row_count} rows, ${data.column_count} columns). Give a brief overview of the data.`);
        } catch (error) {
          // Fallback to simple system message if chat fails
          console.error("Auto-summary failed:", error);
          const systemMessageText = `File uploaded successfully. ${data.row_count} rows, ${data.column_count} columns loaded.`;
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), role: "system", text: systemMessageText },
          ]);
        }

        // Fetch smart suggestions based on data columns
        try {
          const suggestionsRes = await fetch(`/api/suggestions/${sessionId}`);
          if (suggestionsRes.ok) {
            const suggestionsData = await suggestionsRes.json();
            setSuggestions(suggestionsData.suggestions || []);
          }
        } catch {
          // Suggestions are optional
        }
      }
    } else {
      // Add error message locally and persist to backend
      const errorText = "Failed to upload file. Please try again.";
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", text: errorText },
      ]);
      await saveMessageToBackend("assistant", errorText);
    }

    setIsLoading(false);
  };

  const handleSend = async () => {
    // Can only send text queries after file is uploaded
    if (!chatInput.trim() || !fileInfo || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: chatInput.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setSuggestions([]);
    const currentInput = chatInput.trim();
    setChatInput("");
    setIsLoading(true);

    try {
      await sendChatMessage(currentInput);
    } catch (error) {
      console.error("[Send Error]", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          text: "Something went wrong. The server may have restarted — please refresh the page and re-upload your file.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
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
      handleFileUpload(file);
    }
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Only accept CSV files
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        handleFileUpload(file);
      }
    }
  };

  return (
    <div
      className="flex gap-3 px-1.5 py-2.5 fixed inset-0 overflow-hidden"
      style={{ height: '100vh', alignItems: 'stretch', backgroundColor: '#111111' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 backdrop-blur-sm flex items-center justify-center pointer-events-none" style={{ backgroundColor: 'rgba(26,22,37,0.5)' }}>
          <div className="rounded-2xl px-8 py-6 shadow-xl border-2 border-dashed flex flex-col items-center gap-3" style={{ backgroundColor: '#252131', borderColor: '#9333ea' }}>
            <Upload className="w-10 h-10" style={{ color: '#9333ea' }} />
            <p className="text-[15px]" style={{ fontWeight: 590, color: '#e4e4e7' }}>
              Drop CSV file here
            </p>
            <p className="text-[12px]" style={{ color: '#a1a1aa' }}>
              {fileInfo ? "This will replace the current file" : "Release to upload"}
            </p>
          </div>
        </div>
      )}

      {/* Left sidebar */}
      <div className="flex flex-col gap-1.5 w-[340px] shrink-0 h-full min-w-0">
        {/* Tab bar */}
        <GlassPanel className="shrink-0" style={{ backgroundColor: '#111111' }}>
          <div className="flex items-center py-2.5 px-2.5">
            <button
              onClick={() => setActiveTab("data")}
              className="flex-1 h-[24px] flex items-center justify-center gap-1.5 rounded-lg px-2 transition-colors"
              style={activeTab === "data" ? {
                background: 'linear-gradient(135deg, rgba(147,51,234,0.5) 0%, rgba(107,33,168,0.6) 100%)',
                border: '1px solid rgba(147,51,234,0.3)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.2)',
              } : { border: '1px solid transparent' }}
            >
              <TableProperties className="w-[14px] h-[14px]" style={{ color: activeTab === "data" ? '#fff' : '#a1a1aa' }} />
              <span className="text-[11px]" style={{ fontWeight: 510, color: activeTab === "data" ? '#fff' : '#a1a1aa' }}>
                Data
              </span>
            </button>
            <button
              onClick={() => setActiveTab("plots")}
              className="flex-1 h-[24px] flex items-center justify-center gap-1.5 rounded-lg px-2 transition-all"
              style={activeTab === "plots" ? {
                background: 'linear-gradient(135deg, rgba(147,51,234,0.5) 0%, rgba(107,33,168,0.6) 100%)',
                border: '1px solid rgba(147,51,234,0.3)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.2)',
              } : { border: '1px solid transparent' }}
            >
              <BarChart3 className="w-[14px] h-[14px]" style={{ color: activeTab === "plots" ? '#fff' : '#a1a1aa' }} />
              <span className="text-[11px]" style={{ fontWeight: 510, color: activeTab === "plots" ? '#fff' : '#a1a1aa' }}>
                Plots
              </span>
            </button>
          </div>
        </GlassPanel>

        {/* Content panel */}
        <GlassPanel className="flex-1">
          <div className="h-full overflow-auto custom-scrollbar" style={{ backgroundColor: '#1e1b2e' }}>
            {activeTab === "data" ? (
              <DataTab
                fileInfo={fileInfo}
                dataVersion={dataVersion}
                onVersionChange={switchVersion}
                onExpandClick={() => setShowFullData(true)}
              />
            ) : (
              <PlotsTab plots={plots} />
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Right panel */}
      <GlassPanel className="flex-1 min-w-0" style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, paddingTop: '14px', paddingBottom: '14px' }}>
          {/* Title */}
          <div className="px-5 flex items-center justify-between" style={{ flexShrink: 0 }}>
            <h2 className="text-[18px]" style={{ fontWeight: 590, color: '#e4e4e7' }}>
              CSV Analyser
            </h2>
            <div className="flex items-center gap-2">
              {fileInfo && (
                <span className="text-[11px]" style={{ color: '#a1a1aa' }}>
                  {fileInfo.filename}
                </span>
              )}
              <button
                onClick={handleNewChat}
                disabled={isLoading}
                className="h-[28px] px-2.5 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(147,51,234,0.5) 0%, rgba(107,33,168,0.6) 100%)',
                  border: '1px solid rgba(147,51,234,0.4)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(10px)',
                }}
                title="Start a new conversation"
              >
                <SquarePen className="w-[14px] h-[14px]" style={{ color: '#fff' }} />
                <span className="text-[12px]" style={{ fontWeight: 500, color: '#fff' }}>New</span>
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div
            className="px-5 py-4 custom-scrollbar"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <p className="text-[13px]" style={{ fontWeight: 510, color: '#a1a1aa' }}>
                  {fileInfo ? "Ask a question about your data" : "Upload a CSV file to get started"}
                </p>
                {!sessionId && (
                  <p className="text-[11px]" style={{ color: '#a1a1aa' }}>Creating session...</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex relative group ${
                      msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${msg.chartConfig ? 'w-full' : 'max-w-[80%]'}`}
                      style={{
                        backgroundColor: msg.role === "user" ? '#9333ea' : msg.role === "system" ? 'rgba(147,51,234,0.15)' : '#1a1625',
                        color: msg.role === "user" ? '#fff' : '#e4e4e7',
                      }}
                    >
                      {msg.fileName && (
                        <div
                          className="flex items-center gap-1.5 mb-1.5 text-[11px]"
                          style={{ color: msg.role === "user" ? 'rgba(255,255,255,0.7)' : '#a1a1aa' }}
                        >
                          <FileText className="w-3 h-3" />
                          <span>{msg.fileName}</span>
                        </div>
                      )}
                      <div
                        className="text-[13px]"
                        style={{ fontWeight: 400, color: msg.role === "user" ? '#fff' : '#e4e4e7' }}
                      >
                        <MarkdownLatex>{msg.text}</MarkdownLatex>
                      </div>
                      {/* Inline chart */}
                      {msg.chartConfig && msg.chartData && msg.chartData.length > 0 && (
                        <div
                          className="mt-2 rounded-lg overflow-hidden cursor-pointer"
                          style={{ width: '100%', height: 280, backgroundColor: '#161328', border: '1px solid rgba(147,51,234,0.12)' }}
                          onClick={() => setFullscreenPlot({
                            title: msg.plotTitle || "Plot",
                            chartConfig: msg.chartConfig!,
                            chartData: msg.chartData!,
                          })}
                        >
                          <Chart config={msg.chartConfig} data={msg.chartData} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Suggestion chips */}
                {suggestions.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setChatInput(suggestion.text);
                          setSuggestions([]);
                        }}
                        className="rounded-full px-3.5 py-1.5 text-[11px] transition-all hover:opacity-80"
                        style={{
                          fontWeight: 510,
                          color: '#e4e4e7',
                          backgroundColor: 'rgba(147,51,234,0.12)',
                          border: '1px solid rgba(147,51,234,0.25)',
                        }}
                      >
                        {suggestion.text}
                      </button>
                    ))}
                  </div>
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-5 py-3.5" style={{ backgroundColor: '#1a1625' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full status-pulse" style={{ backgroundColor: '#9333ea' }} />
                        <span className="text-[12px]" style={{ fontWeight: 510, color: '#a1a1aa' }}>
                          {statusMessage || "Thinking..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="px-5" style={{ flexShrink: 0 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {!fileInfo ? (
              /* No file uploaded - show upload button only */
              <button
                onClick={handleFileAttach}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-full px-6 py-3 transition-all disabled:opacity-50 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, rgba(147,51,234,0.5) 0%, rgba(107,33,168,0.6) 100%)',
                  border: '1px solid rgba(147,51,234,0.4)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-[15px] h-[15px] animate-spin" style={{ color: '#fff' }} />
                ) : (
                  <>
                    <Upload className="w-[15px] h-[15px]" style={{ color: '#fff' }} />
                    <span className="text-[13px]" style={{ fontWeight: 510, color: '#fff' }}>
                      Upload CSV file
                    </span>
                  </>
                )}
              </button>
            ) : (
              /* File uploaded - show text input */
              <div className="flex items-center gap-2.5">
                <div className="flex-1 flex items-center gap-0.5 rounded-full px-6 py-2.5" style={{ backgroundColor: '#1a1625', border: '1px solid rgba(113,113,122,0.3)' }}>
                  <input
                    type="text"
                    placeholder="Ask anything about your data"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-[13px] outline-none"
                    style={{ fontWeight: 510, color: '#e4e4e7' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!hasContent || isLoading}
                    className={`w-[36px] h-[36px] rounded-full flex items-center justify-center relative overflow-hidden shrink-0 transition-all duration-200 ${
                      hasContent && !isLoading ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="absolute inset-0 rounded-full" style={hasContent && !isLoading ? {
                      background: 'linear-gradient(135deg, rgba(147,51,234,0.6) 0%, rgba(107,33,168,0.7) 100%)',
                      border: '1px solid rgba(147,51,234,0.4)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                    } : {
                      background: 'linear-gradient(135deg, rgba(63,58,74,0.6) 0%, rgba(50,45,65,0.7) 100%)',
                      border: '1px solid rgba(147,51,234,0.15)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                    }} />
                    {isLoading ? (
                      <Loader2 className="w-[15px] h-[15px] relative z-10 animate-spin" style={{ color: '#a1a1aa' }} />
                    ) : (
                      <ArrowUp
                        className="w-[15px] h-[15px] relative z-10 transition-colors duration-200"
                        style={{ color: hasContent ? '#fff' : '#a1a1aa' }}
                      />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* Fullscreen data modal — portalled to document.body to escape overflow:hidden */}
      {showFullData && fileInfo && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowFullData(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '90vw',
              height: '85vh',
              maxWidth: 1200,
              maxHeight: 800,
              backgroundColor: '#1e1b2e',
              borderRadius: 16,
              border: '1px solid rgba(147,51,234,0.25)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column' as const,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: '1px solid rgba(147,51,234,0.15)',
              backgroundColor: '#161328',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 590, color: '#e4e4e7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileInfo.filename}
                </span>
                <span style={{ fontSize: 11, color: '#a1a1aa', backgroundColor: 'rgba(147,51,234,0.1)', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                  {fileInfo.row_count} rows x {fileInfo.column_count} columns
                </span>
              </div>
              <button
                onClick={() => setShowFullData(false)}
                style={{
                  flexShrink: 0,
                  marginLeft: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  backgroundColor: '#9333ea',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(147,51,234,0.4)',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>&times;</span>
                Close
              </button>
            </div>

            {/* Table */}
            <div className="custom-scrollbar" style={{ flex: 1, overflow: 'auto', backgroundColor: '#1e1b2e', minHeight: 0 }}>
              {fullDataLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#9333ea' }} />
                  <span style={{ fontSize: 13, color: '#a1a1aa' }}>Loading all rows...</span>
                </div>
              ) : (
                <table style={{ borderCollapse: 'collapse', backgroundColor: '#1e1b2e', minWidth: 'max-content', width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      {fileInfo.columns.map((col, i) => (
                        <th
                          key={col}
                          style={{
                            height: 32,
                            padding: '0 12px',
                            textAlign: 'left' as const,
                            minWidth: 120,
                            backgroundColor: '#161328',
                            borderBottom: '1px solid rgba(147,51,234,0.12)',
                            ...(i > 0 ? { borderLeft: '1px solid rgba(147,51,234,0.12)' } : { paddingLeft: 16 }),
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#e4e4e7', whiteSpace: 'nowrap' }}>
                            {col}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(fullDataRows || fileInfo.preview).map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(147,51,234,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {fileInfo.columns.map((col, i) => (
                          <td
                            key={col}
                            style={{
                              height: 30,
                              padding: '0 12px',
                              fontSize: 12,
                              fontWeight: 400,
                              color: '#e4e4e7',
                              borderBottom: '1px solid rgba(147,51,234,0.1)',
                              whiteSpace: 'nowrap',
                              ...(i > 0 ? { borderLeft: '1px solid rgba(147,51,234,0.1)' } : { paddingLeft: 16 }),
                            }}
                          >
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={{
              flexShrink: 0,
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(147,51,234,0.12)',
              backgroundColor: '#161328',
            }}>
              <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                {fullDataRows
                  ? `Showing all ${fullDataRows.length} of ${fileInfo.row_count} rows`
                  : `Showing ${fileInfo.preview.length} of ${fileInfo.row_count} rows (loading full data...)`
                }
              </span>
              <span style={{ fontSize: 10, color: '#52525b' }}>
                Press Esc to close
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen plot modal */}
      {fullscreenPlot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenPlot(null)}
        >
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: '#252131', width: '80vw', maxWidth: 900, height: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(147,51,234,0.2)' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: '#e4e4e7' }}>{fullscreenPlot.title}</h3>
              <button
                onClick={() => setFullscreenPlot(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ color: '#a1a1aa' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4" style={{ height: 'calc(100% - 60px)' }}>
              <Chart config={fullscreenPlot.chartConfig} data={fullscreenPlot.chartData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
