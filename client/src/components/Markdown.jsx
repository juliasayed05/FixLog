import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/common';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

function CodeBlock({ className = '', children, inline }) {
  const [copied, setCopied] = useState(false);
  const raw = String(children).replace(/\n$/, '');
  if (inline) return <code className="inline-code">{children}</code>;
  const language = /language-([\w-]+)/.exec(className || '')?.[1];
  const highlighted = language && hljs.getLanguage(language)
    ? hljs.highlight(raw, { language }).value
    : hljs.highlightAuto(raw).value;
  async function copy() {
    try { await navigator.clipboard.writeText(raw); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }
  return (
    <div className="code-frame group">
      <div className="code-frame-top"><span>{language || 'code'}</span><button type="button" className="copy-code" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy solution'}</button></div>
      <pre><code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
    </div>
  );
}

export default function Markdown({ children, className = '' }) {
  return <div className={`markdown-body ${className}`}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>{children || ''}</ReactMarkdown></div>;
}
