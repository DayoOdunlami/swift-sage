'use client';

import { useState, useEffect } from 'react';

interface EnvironmentCheck {
  name: string;
  status: boolean;
}

interface ApiRoute {
  method: string;
  path: string;
  description: string;
  status: 'testing' | 'success' | 'failed' | 'unknown';
  responseTime?: number;
}

interface SystemHealth {
  environment: EnvironmentCheck[];
  apiRoutes: ApiRoute[];
  buildInfo: {
    version: string;
    environment: string;
    lastUpdated: string;
  };
}

const SystemDashboard = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSystemHealth = async () => {
    try {
      // Load environment status
      const envResponse = await fetch('/api/system/environment');
      const envData = await envResponse.json();

      // Load API routes
      const routesResponse = await fetch('/api/system/routes');
      const routesData = await routesResponse.json();

      setSystemHealth({
        environment: envData.environment || [],
        apiRoutes: routesData.routes || [],
        buildInfo: {
          version: '1.0.1',
          environment: process.env.NODE_ENV || 'development',
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const testApiRoute = async (route: ApiRoute, index: number) => {
    const updatedRoutes = [...(systemHealth?.apiRoutes || [])];
    updatedRoutes[index] = { ...route, status: 'testing' };
    
    setSystemHealth(prev => prev ? { ...prev, apiRoutes: updatedRoutes } : null);

    try {
      const startTime = Date.now();
      const response = await fetch(route.path, { 
        method: route.method === 'GET' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: route.method === 'POST' ? JSON.stringify({ content: 'Test task from dashboard' }) : undefined,
      });
      const responseTime = Date.now() - startTime;

      updatedRoutes[index] = {
        ...route,
        status: response.ok ? 'success' : 'failed',
        responseTime,
      };
    } catch (error) {
      updatedRoutes[index] = { ...route, status: 'failed' };
    }

    setSystemHealth(prev => prev ? { ...prev, apiRoutes: updatedRoutes } : null);
  };

  const refreshAll = () => {
    setRefreshing(true);
    loadSystemHealth();
  };

  useEffect(() => {
    loadSystemHealth();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
        <h1>Swift Sage System Dashboard</h1>
        <p>Loading system health...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'system-ui',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>Swift Sage System Dashboard</h1>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          style={{
            padding: '10px 20px',
            backgroundColor: refreshing ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
        >
          {refreshing ? 'Refreshing...' : '⚡ Refresh'}
        </button>
      </div>

      {/* Build Information Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>Build Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <strong>Version:</strong> {systemHealth?.buildInfo.version}
          </div>
          <div>
            <strong>Environment:</strong> {systemHealth?.buildInfo.environment}
          </div>
          <div>
            <strong>Last Updated:</strong> {new Date(systemHealth?.buildInfo.lastUpdated || '').toLocaleString()}
          </div>
        </div>
      </div>

      {/* Environment Variables Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>Environment Variables</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {systemHealth?.environment.map((env) => (
            <div key={env.name} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <span>{env.name}</span>
              <span style={{ 
                color: env.status ? '#28a745' : '#dc3545',
                fontWeight: 'bold'
              }}>
                {env.status ? '✅' : '❌'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* API Routes Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>API Routes</h2>
        <div style={{ display: 'grid', gap: '15px' }}>
          {systemHealth?.apiRoutes.map((route, index) => (
            <div key={`${route.method}-${route.path}`} style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 100px 80px 100px',
              gap: '15px',
              alignItems: 'center',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <span style={{
                backgroundColor: route.method === 'GET' ? '#28a745' : '#007bff',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                textAlign: 'center'
              }}>
                {route.method}
              </span>
              <div>
                <div style={{ fontWeight: 'bold' }}>{route.path}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{route.description}</div>
              </div>
              <span style={{
                color: route.status === 'success' ? '#28a745' : 
                      route.status === 'failed' ? '#dc3545' :
                      route.status === 'testing' ? '#ffc107' : '#6c757d'
              }}>
                {route.status === 'success' ? '✅' : 
                 route.status === 'failed' ? '❌' :
                 route.status === 'testing' ? '⏳' : '⚪'}
              </span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {route.responseTime ? `${route.responseTime}ms` : '-'}
              </span>
              <button
                onClick={() => testApiRoute(route, index)}
                disabled={route.status === 'testing'}
                style={{
                  padding: '6px 12px',
                  backgroundColor: route.status === 'testing' ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: route.status === 'testing' ? 'not-allowed' : 'pointer',
                }}
              >
                {route.status === 'testing' ? 'Testing...' : '▶️ Test'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Progress Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#333' }}>Integration Progress</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {[
            { name: 'Voice Interface', status: true, description: 'Groq + Cartesia working' },
            { name: 'System Dashboard', status: true, description: 'Real-time monitoring' },
            { name: 'Environment Setup', status: !!systemHealth?.environment.every(env => env.status), description: 'API keys configured' },
            { name: 'Todoist Direct API', status: false, description: 'Basic CRUD operations' },
            { name: 'AI Function Integration', status: false, description: 'Natural language processing' },
            { name: 'End-to-End Workflow', status: false, description: 'Voice → AI → Todoist → Response' },
          ].map((item) => (
            <div key={item.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{item.description}</div>
              </div>
              <span style={{
                color: item.status ? '#28a745' : '#6c757d',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                {item.status ? '✅' : '⭕'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard; 