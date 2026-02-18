import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { saveApiConfig } from '@/app/services/apiService';
import { toast } from 'sonner';
import { Save, RotateCw } from 'lucide-react';

interface ApiConfig {
  sharePriceApi: string;
  linkedinPostsApi: string;
  powerBiEmbedUrl: string;
  powerBiReportId: string;
}

export function ApiConfigPage() {
  // Load config from localStorage on mount
  const loadStoredConfig = (): ApiConfig => {
    const stored = localStorage.getItem('apiConfig');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getDefaultConfig();
      }
    }
    return getDefaultConfig();
  };

  const getDefaultConfig = (): ApiConfig => ({
    sharePriceApi: 'https://api.example.com/stock/corpay',
    linkedinPostsApi: 'https://api.linkedin.com/v2/posts',
    powerBiEmbedUrl: 'https://app.powerbi.com/reportEmbed',
    powerBiReportId: 'your-report-id-here'
  });

  const [config, setConfig] = useState<ApiConfig>(loadStoredConfig());
  const [isSaving, setIsSaving] = useState(false);

  // Load config when component mounts
  useEffect(() => {
    const stored = loadStoredConfig();
    setConfig(stored);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Save to localStorage
      saveApiConfig(config);
      
      // PUT /api/admin/config (for backend if needed)
      toast.success('API configuration saved successfully');
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultConfig = getDefaultConfig();
    setConfig(defaultConfig);
    saveApiConfig(defaultConfig);
    toast.info('Configuration reset to defaults');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-white mb-2">API Configuration</h1>
        <p className="text-gray-400">Manage external API endpoints and integrations</p>
      </div>

      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">External API Endpoints</CardTitle>
          <CardDescription className="text-gray-400">
            Configure external APIs for share price, posts, and PowerBI integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sharePrice" className="text-white">Share Price API Endpoint</Label>
              <Input
                id="sharePrice"
                value={config.sharePriceApi}
                onChange={(e) => setConfig({ ...config, sharePriceApi: e.target.value })}
                placeholder="https://api.example.com/stock/corpay"
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-400">
                API endpoint to fetch current Corpay share price data
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinPosts" className="text-white">LinkedIn Posts API Endpoint</Label>
              <Input
                id="linkedinPosts"
                value={config.linkedinPostsApi}
                onChange={(e) => setConfig({ ...config, linkedinPostsApi: e.target.value })}
                placeholder="https://api.linkedin.com/v2/posts"
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-400">
                API endpoint to fetch LinkedIn posts for the dashboard
              </p>
            </div>

            <div className="h-px bg-white/10 my-6"></div>

            <div className="space-y-2">
              <Label htmlFor="powerBiUrl" className="text-white">PowerBI Embed URL</Label>
              <Input
                id="powerBiUrl"
                value={config.powerBiEmbedUrl}
                onChange={(e) => setConfig({ ...config, powerBiEmbedUrl: e.target.value })}
                placeholder="https://app.powerbi.com/reportEmbed"
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-400">
                PowerBI embed URL for dashboard integration
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="powerBiReport" className="text-white">PowerBI Report ID</Label>
              <Input
                id="powerBiReport"
                value={config.powerBiReportId}
                onChange={(e) => setConfig({ ...config, powerBiReportId: e.target.value })}
                placeholder="your-report-id-here"
                className="bg-white/10 border-white/20 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-400">
                Unique identifier for your PowerBI report
              </p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-yellow-300">
              <strong>Security Note:</strong> These API endpoints will be used by the frontend dashboard. Ensure proper authentication and rate limiting are configured on your API servers.
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-pink-600 hover:bg-pink-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button 
              onClick={handleReset}
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white focus-visible:ring-white/20"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">API Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Share Price API', status: 'Connected', latency: '45ms' },
              { name: 'LinkedIn Posts API', status: 'Connected', latency: '120ms' },
              { name: 'PowerBI Embed', status: 'Connected', latency: '80ms' }
            ].map((api, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div>
                  <p className="text-white">{api.name}</p>
                  <p className="text-sm text-gray-400">Latency: {api.latency}</p>
                </div>
                <span className="px-3 py-1 rounded text-xs bg-green-500/20 text-green-300">
                  {api.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
