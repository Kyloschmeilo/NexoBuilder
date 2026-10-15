import { useState } from 'react';

/** How many sent commands the console remembers. */
const HISTORY_LIMIT = 30;

/** The console's command line with shell-like history: arrow up/down walk through the sent commands. */
export function useCommandHistory() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  /** Position in `history` while browsing it; -1 is the command being typed. */
  const [position, setPosition] = useState(-1);

  const browse = (next: number) => {
    setPosition(next);
    setCommand(next >= 0 ? history[next] : '');
  };

  return {
    command,
    setCommand,
    /** Remembers a sent command and clears the line. */
    commit(text: string) {
      setHistory((previous) => [text, ...previous.filter((entry) => entry !== text)].slice(0, HISTORY_LIMIT));
      setPosition(-1);
      setCommand('');
    },
    older() {
      if (history.length) browse(Math.min(position + 1, history.length - 1));
    },
    newer() {
      browse(Math.max(position - 1, -1));
    },
  };
}
