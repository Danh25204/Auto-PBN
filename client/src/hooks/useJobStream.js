import { useState, useEffect, useRef } from 'react';

/**
 * Opens an SSE stream for a job and collects all events.
 * Each event: { type: 'status'|'progress'|'error', data: object }
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

    setEvents([]);
    setSummary(null);
    setRunning(true);

    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    esRef.current = es;

    const addEvent = (type, data) =>
      setEvents((prev) => [...prev, { type, data }]);

    es.addEventListener('status', (e) => addEvent('status', JSON.parse(e.data)));
    es.addEventListener('progress', (e) => addEvent('progress', JSON.parse(e.data)));
    es.addEventListener('error-event', (e) => addEvent('error', JSON.parse(e.data)));

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

    return () => es.close();
  }, [jobId]);

  return { events, summary, running };
}
