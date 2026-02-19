import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import axios from 'axios';

interface ChartCategory {
  category: string;
  percentage: number;
}

export function ChartsPage() {
  const [categories, setCategories] = useState<ChartCategory[]>([
    { category: '', percentage: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addCategory = () => {
    setCategories([...categories, { category: '', percentage: 0 }]);
  };

  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      setCategories(categories.filter((_, i) => i !== index));
    } else {
      toast.error('At least one category is required');
    }
  };

  const updateCategory = (index: number, field: keyof ChartCategory, value: string | number) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const handleSave = async () => {
    // Validate all fields are filled
    if (categories.some(cat => !cat.category || cat.percentage <= 0)) {
      toast.error('Please fill in all category names and percentages (greater than 0)');
      return;
    }

    // Validate percentages sum to 100
    const totalPercentage = categories.reduce((sum, cat) => sum + Number(cat.percentage), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error(`Percentages must sum to 100%. Current total: ${totalPercentage.toFixed(2)}%`);
      return;
    }

    setIsSaving(true);

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');

    // Default colors for categories (cycling through brand colors)
    const colors = ['#981239', '#3D1628', '#E6E8E7', '#BE1549', '#8B1538', '#5A0F24'];
    
    const proportionsData = categories.map((cat, index) => ({
      category: cat.category,
      percentage: Number(cat.percentage),
      color: colors[index % colors.length]
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // First, check if backend is reachable
    try {
      await axios.get(`${API_BASE_URL}/health`, { timeout: 120000 });
    } catch (healthError: any) {
      console.error('Backend health check failed:', healthError.message);
      toast.error(`Backend not reachable at ${API_BASE_URL}. Please ensure the backend server is running.`);
      setIsSaving(false);
      return;
    }

    // Try to save to backend API (dev endpoint without auth)
    try {
      let response;
      try {
        response = await axios.post(
          `${API_BASE_URL}/api/admin/revenue/proportions/manual-dev`,
          { proportions: proportionsData },
          { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000
          }
        );
        console.log('Successfully saved via dev endpoint');
      } catch (devError: any) {
        console.log('Dev endpoint failed, trying auth endpoint...');
        response = await axios.post(
          `${API_BASE_URL}/api/admin/revenue/proportions/manual`,
          { proportions: proportionsData },
          { 
            headers,
            timeout: 120000
          }
        );
        console.log('Successfully saved via auth endpoint');
      }

      // Successfully saved to backend
      localStorage.setItem('chartProportions', JSON.stringify(proportionsData));
      window.dispatchEvent(new CustomEvent('chartProportionsUpdated', {
        detail: proportionsData
      }));
      toast.success('Chart proportions saved successfully to backend');
      setIsSaving(false);
      return;
    } catch (apiError: any) {
      console.error('Backend API error:', {
        message: apiError.message,
        code: apiError.code,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
      });

      // Fallback to localStorage if API fails
      localStorage.setItem('chartProportions', JSON.stringify(proportionsData));
      window.dispatchEvent(new CustomEvent('chartProportionsUpdated', {
        detail: proportionsData
      }));
      toast.warning('Backend API unavailable. Data saved locally. Please check backend connection.');
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-white mb-2">Charts</h1>
        <p className="text-gray-400">Manage and customize pie chart categories and proportions</p>
      </div>

      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Manual Pie Chart Entry</CardTitle>
          <CardDescription className="text-gray-400">
            Customize pie chart categories, names, and percentages. Percentages must sum to 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((category, index) => (
            <div key={index} className="flex gap-3 items-end p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`category-${index}`} className="text-white">
                  Category Name
                </Label>
                <Input
                  id={`category-${index}`}
                  type="text"
                  placeholder="e.g., Fleet, Rice, Corporate"
                  value={category.category}
                  onChange={(e) => updateCategory(index, 'category', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="w-32 space-y-2">
                <Label htmlFor={`percentage-${index}`} className="text-white">
                  Percentage (%)
                </Label>
                <Input
                  id={`percentage-${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  value={category.percentage || ''}
                  onChange={(e) => updateCategory(index, 'percentage', parseFloat(e.target.value) || 0)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeCategory(index)}
                disabled={categories.length === 1}
                className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 hover:border-red-500/50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={addCategory}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-semibold">Total Percentage:</p>
              <p className={`text-lg font-bold ${
                Math.abs(categories.reduce((sum, cat) => sum + Number(cat.percentage || 0), 0) - 100) < 0.01
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {categories.reduce((sum, cat) => sum + Number(cat.percentage || 0), 0).toFixed(2)}%
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              {isSaving ? 'Saving...' : 'Save Chart Proportions'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
