import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, RefreshCw, Globe, Linkedin, X } from 'lucide-react';
import axios from 'axios';

interface Post {
  id: string;
  title: string;
  content: string;
  image?: string;
  type: 'linkedin' | 'crossBorder';
  createdAt: string;
}

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [activeTab, setActiveTab] = useState('corpay');
  const [linkedInPostUrls, setLinkedInPostUrls] = useState<string[]>(['']);
  const [crossBorderPostUrls, setCrossBorderPostUrls] = useState<string[]>(['']);

  const loadPostsFromAPI = async () => {
    setIsLoadingPosts(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const [corpayRes, crossBorderRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/dashboard/posts`, { params: { limit: 50 } }),
        axios.get(`${API_BASE_URL}/api/dashboard/cross-border-posts`, { params: { limit: 50 } })
      ]);

      const allPosts: Post[] = [];

      if (corpayRes.status === 'fulfilled' && corpayRes.value.data) {
        const corpayPosts = Array.isArray(corpayRes.value.data) ? corpayRes.value.data : [];
        corpayPosts.forEach((post: any) => {
          allPosts.push({
            id: post.id?.toString() || Date.now().toString(),
            title: post.content?.substring(0, 50) || 'Corpay Post',
            content: post.content || post.post_url || '',
            image: post.image_url,
            type: 'linkedin',
            createdAt: post.created_at || post.createdAt || new Date().toISOString()
          });
        });
      }

      if (crossBorderRes.status === 'fulfilled' && crossBorderRes.value.data) {
        const crossBorderPosts = Array.isArray(crossBorderRes.value.data) ? crossBorderRes.value.data : [];
        crossBorderPosts.forEach((post: any) => {
          allPosts.push({
            id: post.id?.toString() || Date.now().toString(),
            title: post.content?.substring(0, 50) || 'Cross-Border Post',
            content: post.content || post.post_url || '',
            image: post.image_url,
            type: 'crossBorder',
            createdAt: post.created_at || post.createdAt || new Date().toISOString()
          });
        });
      }

      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
      toast.error('Failed to load posts');
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPostsFromAPI();
  }, []);

  const handleDelete = async (id: string) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    try {
      try {
        await axios.delete(`${API_BASE_URL}/api/admin/posts/${id}/dev`, { timeout: 5000 });
      } catch (devErr: any) {
        if (devErr.response?.status === 404) {
          setPosts((prev) => prev.filter((p) => p.id !== id));
          return;
        }
        if (devErr.response?.status === 401 || devErr.response?.status === 403) {
          await axios.delete(`${API_BASE_URL}/api/admin/posts/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: 5000
          });
        } else {
          throw devErr;
        }
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Post deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail ?? 'Delete failed');
    }
  };

  // Filter posts based on active tab
  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'crossborder':
        return posts.filter(post => post.type === 'crossBorder');
      case 'corpay':
        return posts.filter(post => post.type === 'linkedin');
      case 'all':
      default:
        return posts;
    }
  };

  const filteredPosts = getFilteredPosts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-white mb-2">Posts Management</h1>
        <p className="text-gray-400">Manage LinkedIn and Cross-Border posts (manual entry only)</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/10 text-white">
          <TabsTrigger value="corpay" className="text-white data-[state=active]:bg-pink-600 data-[state=active]:text-white">
            <Linkedin className="w-4 h-4 mr-2" />
            Corpay Posts
          </TabsTrigger>
          <TabsTrigger value="crossborder" className="text-white data-[state=active]:bg-pink-600 data-[state=active]:text-white">
            <Globe className="w-4 h-4 mr-2" />
            Cross-Border Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="corpay" className="mt-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <div>
                <CardTitle className="text-white">Corpay Posts</CardTitle>
                <CardDescription className="text-gray-400">
                  {filteredPosts.length} post(s)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 text-pink-500 animate-spin mr-2" />
                  <span className="text-white">Loading posts...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Title</TableHead>
                      <TableHead className="text-gray-300">Content</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      <TableHead className="text-gray-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                          Latest Corpay post will appear here once available
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPosts.map((post) => (
                        <TableRow key={post.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">
                            <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">
                              LinkedIn
                            </span>
                          </TableCell>
                          <TableCell className="text-white">{post.title}</TableCell>
                          <TableCell className="text-gray-400 max-w-md truncate">{post.content}</TableCell>
                          <TableCell className="text-gray-400">{post.createdAt}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(post.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry Card for Corpay Posts */}
          <Card className="bg-white/10 border-white/20 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Manual Entry</CardTitle>
              <CardDescription className="text-gray-400">
                Create Corpay posts manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-white">LinkedIn Post URL(s)</Label>
                {linkedInPostUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...linkedInPostUrls];
                        newUrls[index] = e.target.value;
                        setLinkedInPostUrls(newUrls);
                      }}
                      placeholder="https://www.linkedin.com/posts/..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 flex-1"
                    />
                    {linkedInPostUrls.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const newUrls = linkedInPostUrls.filter((_, i) => i !== index);
                          setLinkedInPostUrls(newUrls);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLinkedInPostUrls([...linkedInPostUrls, ''])}
                  className="w-full border-pink-500/50 text-pink-400 hover:bg-pink-500/20 hover:border-pink-500 hover:text-pink-300 bg-pink-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another URL
                </Button>
                <p className="text-xs text-gray-400 mt-1">
                  Enter the full URL(s) of the LinkedIn post(s) you want to add
                </p>
              </div>
              <Button 
                onClick={async () => {
                  const validUrls = linkedInPostUrls.filter(url => url.trim());
                  if (validUrls.length === 0) {
                    toast.error('Please enter at least one LinkedIn post URL');
                    return;
                  }

                  try {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    // Use no-auth dev endpoint so manual post works without login; fallback to auth endpoint if dev returns 404
                    const promises = validUrls.map(async (url) => {
                      try {
                        const res = await axios.post(
                          `${API_BASE_URL}/api/admin/posts/from-url-dev`,
                          { post_url: url.trim(), post_type: 'corpay' },
                          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
                        );
                        return res;
                      } catch (devError: any) {
                        if (devError.response?.status === 404) {
                          return await axios.post(
                            `${API_BASE_URL}/api/admin/posts/from-url`,
                            { post_url: url.trim(), post_type: 'corpay' },
                            { headers, timeout: 15000 }
                          );
                        }
                        throw devError;
                      }
                    });

                    await Promise.all(promises);
                    toast.success(`${validUrls.length} post(s) added successfully! They will appear in the dashboard.`);
                    setLinkedInPostUrls(['']);
                    loadPostsFromAPI();
                  } catch (error: any) {
                    console.error('Error posting URLs:', error);
                    let errorMsg = 'Failed to add post(s)';
                    if (error.response?.data?.detail) {
                      errorMsg = typeof error.response.data.detail === 'string' 
                        ? error.response.data.detail 
                        : JSON.stringify(error.response.data.detail);
                    } else if (error.message) {
                      errorMsg = typeof error.message === 'string' ? error.message : String(error.message);
                    }
                    toast.error(errorMsg);
                  }
                }}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                Post
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crossborder" className="mt-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <div>
                <CardTitle className="text-white">Cross-Border Posts</CardTitle>
                <CardDescription className="text-gray-400">
                  {filteredPosts.length} post(s)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 text-pink-500 animate-spin mr-2" />
                  <span className="text-white">Loading posts...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Title</TableHead>
                      <TableHead className="text-gray-300">Content</TableHead>
                      <TableHead className="text-gray-300">Created</TableHead>
                      <TableHead className="text-gray-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                          Latest Cross-border post will appear here once available
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPosts.map((post) => (
                        <TableRow key={post.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-300">
                              Cross-Border
                            </span>
                          </TableCell>
                          <TableCell className="text-white">{post.title}</TableCell>
                          <TableCell className="text-gray-400 max-w-md truncate">{post.content}</TableCell>
                          <TableCell className="text-gray-400">{post.createdAt}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(post.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry Card for Cross-Border Posts */}
          <Card className="bg-white/10 border-white/20 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Manual Entry</CardTitle>
              <CardDescription className="text-gray-400">
                Create Cross-Border posts manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-white">Cross-Border Post URL(s)</Label>
                {crossBorderPostUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...crossBorderPostUrls];
                        newUrls[index] = e.target.value;
                        setCrossBorderPostUrls(newUrls);
                      }}
                      placeholder="https://www.linkedin.com/posts/..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 flex-1"
                    />
                    {crossBorderPostUrls.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const newUrls = crossBorderPostUrls.filter((_, i) => i !== index);
                          setCrossBorderPostUrls(newUrls);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCrossBorderPostUrls([...crossBorderPostUrls, ''])}
                  className="w-full border-pink-500/50 text-pink-400 hover:bg-pink-500/20 hover:border-pink-500 hover:text-pink-300 bg-pink-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another URL
                </Button>
                <p className="text-xs text-gray-400 mt-1">
                  Enter the full URL(s) of the Cross-Border post(s) you want to add
                </p>
              </div>
              <Button 
                onClick={async () => {
                  const validUrls = crossBorderPostUrls.filter(url => url.trim());
                  if (validUrls.length === 0) {
                    toast.error('Please enter at least one Cross-Border post URL');
                    return;
                  }

                  try {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    // Use no-auth dev endpoint so manual post works without login; fallback to auth endpoint if dev returns 404
                    const promises = validUrls.map(async (url) => {
                      try {
                        const res = await axios.post(
                          `${API_BASE_URL}/api/admin/posts/from-url-dev`,
                          { post_url: url.trim(), post_type: 'cross_border' },
                          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
                        );
                        return res;
                      } catch (devError: any) {
                        if (devError.response?.status === 404) {
                          return await axios.post(
                            `${API_BASE_URL}/api/admin/posts/from-url`,
                            { post_url: url.trim(), post_type: 'cross_border' },
                            { headers, timeout: 15000 }
                          );
                        }
                        throw devError;
                      }
                    });

                    await Promise.all(promises);
                    toast.success(`${validUrls.length} post(s) added successfully! They will appear in the dashboard.`);
                    setCrossBorderPostUrls(['']);
                    loadPostsFromAPI();
                  } catch (error: any) {
                    console.error('Error posting URLs:', error);
                    let errorMsg = 'Failed to add post(s)';
                    if (error.response?.data?.detail) {
                      errorMsg = typeof error.response.data.detail === 'string' 
                        ? error.response.data.detail 
                        : JSON.stringify(error.response.data.detail);
                    } else if (error.message) {
                      errorMsg = typeof error.message === 'string' ? error.message : String(error.message);
                    }
                    toast.error(errorMsg);
                  }
                }}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                Post
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
