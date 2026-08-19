import { useState } from 'react';
import client from '../api/client';

// This widget talks to /chatbot/query on our own backend. In the Wexa AI submission,
// that same endpoint is registered as a Skill on a Wexa Coworker — the Coworker's LLM
// layer handles the natural language, and calls this endpoint to get real graph data
// back (job matches, skill gaps) rather than hallucinating an answer. This widget is a
// stand-in for the Wexa-hosted chat UI so the flow is testable end-to-end without Wexa access.
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Ask me "what are my job matches?" or "what skills am I missing?"' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const lower = text.toLowerCase();
      if (lower.includes('missing') || lower.includes('gap')) {
        setMessages((m) => [
          ...m,
          { from: 'bot', text: 'Open a job on the Skill Gap Analysis page and I\'ll list what\'s missing for that specific role.' },
        ]);
      } else {
        const { data } = await client.post('/chatbot/query', { intent: 'job_matches' });
        const flagged = data.flagged || [];
        const reply =
          flagged.length > 0
            ? `You have ${flagged.length} strong match${flagged.length > 1 ? 'es' : ''}: ${flagged
                .slice(0, 3)
                .map((j) => `${j.title} at ${j.company} (${j.matchPercent}%)`)
                .join(', ')}.`
            : 'No jobs meet the match threshold yet — try adding more skills to your profile.';
        setMessages((m) => [...m, { from: 'bot', text: reply }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { from: 'bot', text: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">Career Assistant</div>
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-msg ${m.from}`}>{m.text}</div>
            ))}
            {loading && <div className="chatbot-msg bot">Thinking…</div>}
          </div>
          <div className="chatbot-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about your matches…"
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
      <button className="chatbot-fab" onClick={() => setOpen((o) => !o)} aria-label="Toggle career assistant">
        {open ? '×' : '💬'}
      </button>
    </>
  );
}
