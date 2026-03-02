import { useState, useEffect, useRef } from 'react';

/**
 * Opens an SSE stream for a job and collects progress events.
 *
 * @param {string|null} jobId
 * @returns {{ events: Array, summary: object|null, running: boolean }}
 */
export function useJobStream(jobId) {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [running, setRunning] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    // Reset state for new job
    setEvents([]);
    setSummary(null);
    setRunning(true);

    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    esRef.current = es;

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setEvents((prev) => [...prev, data]);
    });

    es.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      setSummary(data);
      setRunning(false);
      es.close();
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId]);

  return { events, summary, running };
}
