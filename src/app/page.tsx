'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/health')
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus(data.status);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch health status:', err);
        setHealthStatus('error');
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Welcome to MyScope!</h1>
      <p className="text-lg text-gray-700">
        {loading ? (
          'Checking backend connection...'
        ) : (
          <>
            Backend health status: <span className="font-semibold">{healthStatus}</span>
          </>
        )}
      </p>
      {healthStatus === 'ok' && !loading && (
        <p className="text-green-600 font-medium mt-2">
          If you see that, frontend and backend are talking perfectly!
        </p>
      )}
    </div>
  );
}
