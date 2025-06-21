'use client';

import { useState } from 'react';

export default function TestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testConnections = async () => {
    setLoading(true);
    const testResults: any = {};

    // Test 1: Check if we can reach the API endpoint
    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'test message',
          message: []
        })
      });
      testResults.apiEndpoint = {
        status: response.status,
        ok: response.ok,
        error: response.ok ? null : await response.text()
      };
    } catch (error) {
      testResults.apiEndpoint = {
        status: 'error',
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Check environment variables (client-side limited info)
    testResults.envVars = {
      hasGroqKey: !!process.env.NEXT_PUBLIC_GROQ_API_KEY,
      hasCartesiaKey: !!process.env.NEXT_PUBLIC_CARTESIA_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    };

    // Test 3: Test a simple text input
    try {
      const formData = new FormData();
      formData.append('input', 'Hello, this is a test message');
      formData.append('message', JSON.stringify([]));

      const response = await fetch('/api', {
        method: 'POST',
        body: formData
      });
      
      testResults.textInput = {
        status: response.status,
        ok: response.ok,
        hasTranscript: !!response.headers.get('X-Transcript'),
        hasResponse: !!response.headers.get('X-Response'),
        error: response.ok ? null : await response.text()
      };
    } catch (error) {
      testResults.textInput = {
        status: 'error',
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Swift Sage - API Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Tests</h2>
          <button
            onClick={testConnections}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Connection Tests'}
          </button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="space-y-6">
            {/* Environment Variables */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3">Environment Variables</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Groq API Key:</span>
                  <span className={`ml-2 ${results.envVars?.hasGroqKey ? 'text-green-600' : 'text-red-600'}`}>
                    {results.envVars?.hasGroqKey ? '✅ Set' : '❌ Missing'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Cartesia API Key:</span>
                  <span className={`ml-2 ${results.envVars?.hasCartesiaKey ? 'text-green-600' : 'text-red-600'}`}>
                    {results.envVars?.hasCartesiaKey ? '✅ Set' : '❌ Missing'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Node Environment:</span>
                  <span className="ml-2 text-gray-600">{results.envVars?.nodeEnv || 'Unknown'}</span>
                </div>
                <div>
                  <span className="font-medium">Vercel Environment:</span>
                  <span className="ml-2 text-gray-600">{results.envVars?.vercelEnv || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* API Endpoint Test */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3">API Endpoint Test</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 ${results.apiEndpoint?.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {results.apiEndpoint?.status}
                  </span>
                </div>
                {results.apiEndpoint?.error && (
                  <div>
                    <span className="font-medium">Error:</span>
                    <span className="ml-2 text-red-600 text-sm">{results.apiEndpoint.error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Text Input Test */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3">Text Input Test</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 ${results.textInput?.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {results.textInput?.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Has Transcript:</span>
                  <span className={`ml-2 ${results.textInput?.hasTranscript ? 'text-green-600' : 'text-red-600'}`}>
                    {results.textInput?.hasTranscript ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Has Response:</span>
                  <span className={`ml-2 ${results.textInput?.hasResponse ? 'text-green-600' : 'text-red-600'}`}>
                    {results.textInput?.hasResponse ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                {results.textInput?.error && (
                  <div>
                    <span className="font-medium">Error:</span>
                    <span className="ml-2 text-red-600 text-sm">{results.textInput.error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-3">Next Steps</h3>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>If API keys are missing, add them to your Vercel environment variables</li>
            <li>Required: <code className="bg-gray-200 px-1 rounded">GROQ_API_KEY</code> and <code className="bg-gray-200 px-1 rounded">CARTESIA_API_KEY</code></li>
            <li>If the API endpoint fails, check the server logs for more details</li>
            <li>Once basic tests pass, we can integrate with your Sage backend</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 