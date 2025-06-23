'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, AlertCircle, Play, Zap, Vercel } from 'lucide-react';

interface EnvironmentStatus {
  [key: string]: boolean;
}

interface ApiRoute {
  path: string;
  method: string;
  purpose: string;
  status?: 'working' | 'error' | 'testing' | 'untested';
  responseTime?: number;
  lastTested?: string;
}

interface AiFunction {
  name: string;
  status: 'implemented' | 'planned' | 'testing';
  description: string;
  parameters?: string[];
  category: 'todoist' | 'voice' | 'system';
}

interface BuildInfo {
  version: string;
  environment: string;
  timestamp: string;
  vercel_env?: string;
}

interface SystemHealth {
  environment: EnvironmentStatus;
  apiRoutes: ApiRoute[];
  aiFunctions: AiFunction[];
  buildInfo: BuildInfo;
}

export default function SystemDashboardPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingRoute, setTestingRoute] = useState<string | null>(null);

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    setLoading(true);
    try {
      const [envRes, routesRes, functionsRes] = await Promise.all([
        fetch('/api/system/environment'),
        fetch('/api/system/routes'),
        fetch('/api/system/functions'),
      ]);

      const environment = await envRes.json();
      const apiRoutes = await routesRes.json();
      const aiFunctions = await functionsRes.json();

      setSystemHealth({
        environment,
        apiRoutes,
        aiFunctions,
        buildInfo: {
          version: process.env.NEXT_PUBLIC_VERSION || '1.0.2',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          vercel_env: process.env.NEXT_PUBLIC_VERCEL_ENV,
        }
      });
    } catch (error) {
      console.error('Failed to load system health:', error);
      setSystemHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const testApiRoute = async (routePath: string, method: string) => {
    setTestingRoute(routePath);
    try {
      const startTime = Date.now();
      
      // For POST/PUT etc., send a dummy body. For GET, no body.
      const requestOptions: RequestInit = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (method !== 'GET' && method !== 'DELETE') {
        requestOptions.body = JSON.stringify({ test: true, content: 'Test task from dashboard' });
      }

      const response = await fetch(routePath, requestOptions);
      const responseTime = Date.now() - startTime;

      setSystemHealth(prev => prev ? {
        ...prev,
        apiRoutes: prev.apiRoutes.map(r => 
          r.path === routePath && r.method === method
            ? { ...r, status: response.ok ? 'working' : 'error', responseTime, lastTested: new Date().toISOString() }
            : r
        )
      } : null);

    } catch (error) {
      console.error(`Error testing route ${routePath}:`, error);
      setSystemHealth(prev => prev ? {
        ...prev,
        apiRoutes: prev.apiRoutes.map(r => 
          r.path === routePath && r.method === method
            ? { ...r, status: 'error', lastTested: new Date().toISOString() }
            : r
        )
      } : null);
    } finally {
      setTestingRoute(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="container mx-auto p-6 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-center space-x-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <span>System Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load system health information.</p>
            <p className="text-sm text-muted-foreground mt-2">Please check the server logs and ensure the system APIs are running.</p>
            <Button onClick={loadSystemHealth} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen dark:bg-neutral-900">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Swift Sage Dashboard</h1>
            <p className="text-muted-foreground">Real-time system health, API monitoring, and integration status.</p>
          </div>
          <Button onClick={loadSystemHealth} variant="outline">
            <Zap className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* API Routes */}
            <Card>
              <CardHeader>
                <CardTitle>API Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemHealth.apiRoutes.map((route, index) => (
                    <div key={`${route.path}-${route.method}-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="w-16 justify-center">{route.method}</Badge>
                          <span className="font-mono text-sm">{route.path}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-20">{route.purpose}</p>
                      </div>
                      <div className="flex items-center space-x-4 w-40 justify-end">
                        {route.status && route.status !== 'untested' && (
                           <Badge variant={route.status === 'working' ? 'default' : 'destructive'}>
                              {route.status === 'working' ? <CheckCircle className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                              {route.status}
                           </Badge>
                        )}
                        {route.responseTime !== undefined && (
                          <span className="text-xs text-muted-foreground">{route.responseTime}ms</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => testApiRoute(route.path, route.method)}
                          disabled={!!testingRoute}
                          className="w-10 h-10 p-0"
                        >
                          {testingRoute === route.path ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Functions */}
            <Card>
              <CardHeader>
                <CardTitle>AI Functions & Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemHealth.aiFunctions.map((func) => (
                    <div key={func.name} className="p-3 border rounded-lg">
                       <div className="flex items-center justify-between">
                          <span className="font-semibold">{func.name}</span>
                          <Badge variant={func.status === 'implemented' ? 'default' : 'secondary'}>
                            {func.status}
                          </Badge>
                        </div>
                      <p className="text-sm text-muted-foreground mt-1">{func.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Environment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(systemHealth.environment).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="font-mono text-sm">{key}</span>
                      {value ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Build Info */}
            <Card>
              <CardHeader>
                <CardTitle>Build Information</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Version</span>
                      <p className="font-mono text-sm">{systemHealth.buildInfo.version}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Environment</span>
                      <Badge variant={systemHealth.buildInfo.environment === 'production' ? 'default' : 'secondary'}>
                        {systemHealth.buildInfo.environment}
                      </Badge>
                    </div>
                     <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Vercel ENV</span>
                      <Badge variant="outline">
                        {systemHealth.buildInfo.vercel_env || 'N/A'}
                      </Badge>
                    </div>
                 </div>
              </CardContent>
            </Card>

             {/* Integration Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Integration Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <IntegrationCheckItem label="Voice Interface (Groq)" isChecked={true} />
                  <IntegrationCheckItem label="Text-to-Speech (Cartesia)" isChecked={true} />
                  <IntegrationCheckItem 
                    label="Todoist Direct API" 
                    isChecked={systemHealth.apiRoutes.some(r => r.path.includes('todoist') && r.status === 'working')} 
                  />
                  <IntegrationCheckItem 
                    label="AI Function Calling" 
                    isChecked={systemHealth.aiFunctions.some(f => f.status === 'implemented' && f.category === 'todoist')} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const IntegrationCheckItem = ({ label, isChecked }: { label: string, isChecked: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm">{label}</span>
    {isChecked ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <Clock className="h-5 w-5 text-yellow-500" />
    )}
  </div>
); 