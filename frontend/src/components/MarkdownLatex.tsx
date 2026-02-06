import React from "react";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

interface MarkdownLatexProps {
  children: string;
  className?: string;
}

/**
 * Component that renders text with LaTeX and basic Markdown support.
 *
 * LaTeX syntax:
 * - Inline: $formula$ or \(formula\)
 * - Block: $$formula$$ or \[formula\]
 *
 * Markdown syntax:
 * - **bold**
 * - *italic*
 * - `code`
 * - [link](url)
 * - - list items
 */
export function MarkdownLatex({ children, className }: MarkdownLatexProps) {
  if (!children) return null;

  const elements = parseContent(children);

  return (
    <span className={className}>
      {elements.map((element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </span>
  );
}

function parseContent(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  // Split by block math first ($$...$$)
  const blockParts = text.split(/(\$\$[\s\S]*?\$\$)/g);

  for (const part of blockParts) {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      // Block math
      const formula = part.slice(2, -2).trim();
      try {
        elements.push(
          <div className="my-2 overflow-x-auto">
            <BlockMath math={formula} />
          </div>
        );
      } catch {
        elements.push(<code className="text-red-500">{part}</code>);
      }
    } else {
      // Parse inline math and markdown
      elements.push(...parseInlineContent(part));
    }
  }

  return elements;
}

function parseInlineContent(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  // Regex for inline math ($...$) - non-greedy, single line
  const inlineMathRegex = /\$([^\$\n]+)\$/g;

  let lastIndex = 0;
  let match;

  while ((match = inlineMathRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      elements.push(...parseMarkdown(text.slice(lastIndex, match.index)));
    }

    // Add inline math
    const formula = match[1].trim();
    try {
      elements.push(<InlineMath math={formula} />);
    } catch {
      elements.push(<code className="text-red-500">${formula}$</code>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(...parseMarkdown(text.slice(lastIndex)));
  }

  return elements;
}

function parseMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];

  // Split by lines to handle line breaks
  const lines = text.split("\n");

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      elements.push(<br />);
    }

    // Check for list items
    if (line.match(/^[-*]\s+/)) {
      const content = line.replace(/^[-*]\s+/, "");
      elements.push(
        <span className="block pl-4">
          <span className="inline-block w-2 mr-2">•</span>
          {parseInlineMarkdown(content)}
        </span>
      );
      return;
    }

    // Check for numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+/);
    if (numberedMatch) {
      const content = line.replace(/^\d+\.\s+/, "");
      elements.push(
        <span className="block pl-4">
          <span className="inline-block w-4 mr-1">{numberedMatch[1]}.</span>
          {parseInlineMarkdown(content)}
        </span>
      );
      return;
    }

    elements.push(...parseInlineMarkdown(line));
  });

  return elements;
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];

  // Combined regex for markdown patterns
  // Order matters: bold before italic
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, render: (content: string) => <strong>{content}</strong> },
    { regex: /\*([^*]+)\*/g, render: (content: string) => <em>{content}</em> },
    { regex: /`([^`]+)`/g, render: (content: string) => (
      <code className="bg-black/5 px-1 py-0.5 rounded text-[13px] font-mono">{content}</code>
    )},
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (content: string, url: string) => (
      <a href={url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )},
  ];

  let currentText = text;
  let processed = false;

  for (const pattern of patterns) {
    if (pattern.regex.test(currentText)) {
      processed = true;
      const parts = currentText.split(pattern.regex);

      // Reset regex lastIndex
      pattern.regex.lastIndex = 0;

      let matches: RegExpExecArray | null;
      const matchList: { index: number; match: RegExpExecArray }[] = [];

      while ((matches = pattern.regex.exec(currentText)) !== null) {
        matchList.push({ index: matches.index, match: matches });
      }

      let lastIdx = 0;
      for (const { match } of matchList) {
        // Text before match
        if (match.index > lastIdx) {
          elements.push(currentText.slice(lastIdx, match.index));
        }

        // Rendered match
        if (match.length === 3) {
          // Link pattern with 2 groups
          elements.push(pattern.render(match[1], match[2]));
        } else {
          elements.push(pattern.render(match[1]));
        }

        lastIdx = match.index + match[0].length;
      }

      // Remaining text
      if (lastIdx < currentText.length) {
        elements.push(currentText.slice(lastIdx));
      }

      break; // Only process first matching pattern
    }
  }

  if (!processed) {
    elements.push(text);
  }

  return elements;
}

export default MarkdownLatex;
