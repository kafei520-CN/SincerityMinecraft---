import {useEffect} from 'react';

export default function PresenceBeacon({path, rendering = false}: {path: string; rendering?: boolean}) {
  useEffect(() => {
    const ping = () => {
      void fetch('/api/presence/', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({path, rendering}),
        keepalive: true,
      }).catch(() => {});
    };
    ping();
    const timer = window.setInterval(ping, 15000);
    return () => window.clearInterval(timer);
  }, [path, rendering]);
  return null;
}
