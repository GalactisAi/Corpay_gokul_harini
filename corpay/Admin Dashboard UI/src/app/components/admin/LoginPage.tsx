import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import corpayLogo from '@/assets/e2cb3fa95a48c26580b1b8f80641608a87f3d801.png';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/auth/login`,
        {
          email,
          password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      // Store token and user info
      if (response.data.access_token) {
        localStorage.setItem('authToken', response.data.access_token);
        localStorage.setItem('token', response.data.access_token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        toast.success('Logged in successfully');
        onLogin();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message === 'Network Error';
      const errorMessage = isNetworkError
        ? 'Cannot reach server. Ensure the backend is running at http://localhost:8000 and CORS allows this origin.'
        : (error.response?.data?.detail || error.message || 'Login failed');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Corpay Logo */}
      <div className="absolute top-2 left-8">
        <img src={corpayLogo} alt="Corpay" className="h-48 w-auto" />
      </div>

      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-white">Admin Dashboard</CardTitle>
          <CardDescription className="text-gray-300">
            Sign in to manage dashboard content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@corpay.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-pink-600 hover:bg-pink-700"
              disabled={isLoading}
            >
              {isLoading 
                ? 'Signing in...'
                : 'Sign in'
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
