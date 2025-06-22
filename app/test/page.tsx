'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Capabilities = {
  status: string;
  capabilities: string[];
  timestamp: string;
};

export default function StatusPage() {
  const [data, setData] = useState<Capabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // IMPORTANT: Replace this with the actual URL of your deployed Python backend
  const SAGE_BACKEND_URL = process.env.NEXT_PUBLIC_SAGE_BACKEND_URL || 'https://sage-ai-assistant-5s1z.vercel.app';

  useEffect(() => {
    async function fetchCapabilities() {
      setLoading(true);
      setError(null);
      
      if (!SAGE_BACKEND_URL) {
        setError('The SAGE_BACKEND_URL environment variable is not set. Please set NEXT_PUBLIC_SAGE_BACKEND_URL in your Vercel project.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${SAGE_BACKEND_URL}/api/ai/capabilities`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Network response was not ok: ${response.statusText} - ${errorText}`);
        }

        const result: Capabilities = await response.json();
        setData(result);
      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(`Failed to fetch capabilities: ${e.message}`);
        } else {
          setError('An unknown error occurred.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCapabilities();
  }, [SAGE_BACKEND_URL]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 border-b border-gray-200 dark:border-neutral-700 pb-4">
          <h1 className="text-3xl font-bold">Swift Sage - System Status</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            A real-time check of the Python backend capabilities.
          </p>
        </header>

        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Backend API Status</h2>
          
          {loading && <p className="text-blue-500">Loading system status...</p>}
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center">
                <span className={`h-4 w-4 rounded-full mr-3 ${data.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <p>
                  Status: <span className="font-semibold capitalize">{data.status}</span>
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Available AI Functions:</h3>
                {data.capabilities.length > 0 ? (
                  <ul className="list-disc list-inside bg-gray-50 dark:bg-neutral-700/50 rounded-md p-4 space-y-1">
                    {data.capabilities.map((func) => (
                      <li key={func} className="font-mono text-sm">
                        {func}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No capabilities reported.</p>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-neutral-700">
                Last checked: {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-500 hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 