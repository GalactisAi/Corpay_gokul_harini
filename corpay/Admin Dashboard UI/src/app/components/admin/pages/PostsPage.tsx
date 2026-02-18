import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { postsService } from '@/app/services/apiService';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ImageIcon, RefreshCw, FileText, Globe, Linkedin, X, ChevronDown } from 'lucide-react';
import axios from 'axios';

const POST_TYPE_OPTIONS: { value: 'linkedin' | 'crossBorder'; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn Post' },
  { value: 'crossBorder', label: 'Cross-Border Post' },
];

function PostTypeSelect({
  value,
  onChange,
}: {
  value: 'linkedin' | 'crossBorder';
  onChange: (value: 'linkedin' | 'crossBorder') => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = POST_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? 'Select type...';

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-white/20 bg-[rgba(45,20,30,0.85)] text-white text-left"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="w-4 h-4 text-white ml-2 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-md border border-white/20 bg-[#2d141e] text-sm text-white shadow-lg z-50">
          {POST_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                value === opt.value ? 'bg-[#5b1b2e] text-white' : 'hover:bg-[#3d1628] text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [useApiPosts, setUseApiPosts] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [linkedInPostUrls, setLinkedInPostUrls] = useState<string[]>(['']);
  const [crossBorderPostUrls, setCrossBorderPostUrls] = useState<string[]>(['']);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'linkedin' as 'linkedin' | 'crossBorder',
    image: ''
  });

  // Load posts from API on mount
  useEffect(() => {
    if (useApiPosts) {
      loadPostsFromAPI();
    }
  }, [useApiPosts]);

  const loadPostsFromAPI = async () => {
    setIsLoadingPosts(true);
    try {
      // Fetch posts from backend database (includes both manual and API posts)
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      
      // Fetch both Corpay and Cross-Border posts
      const [corpayRes, crossBorderRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/dashboard/posts`, { params: { limit: 50 } }),
        axios.get(`${API_BASE_URL}/api/dashboard/cross-border-posts`, { params: { limit: 50 } })
      ]);

      const allPosts: Post[] = [];

      // Process Corpay posts
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

      // Process Cross-Border posts
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

      if (allPosts.length > 0) {
        setPosts(allPosts);
        toast.success(`Loaded ${allPosts.length} post(s) from database`);
      } else {
        // Fallback to mock API if no database posts
        const apiPosts = await postsService.getPosts();
        if (apiPosts.length > 0) {
          setPosts(apiPosts);
          toast.success(`Loaded ${apiPosts.length} post(s) from API`);
        } else {
          toast.info('No posts found. You can create posts manually.');
        }
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback to mock API on error
      try {
        const apiPosts = await postsService.getPosts();
        if (apiPosts.length > 0) {
          setPosts(apiPosts);
          toast.success(`Loaded ${apiPosts.length} post(s) from API`);
        } else {
          toast.error('Failed to load posts');
        }
      } catch (fallbackError) {
        toast.error('Failed to load posts');
      }
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingPost) {
        // PUT /api/admin/posts
        setPosts(posts.map(p => 
          p.id === editingPost.id 
            ? { ...p, ...formData, updatedAt: new Date().toISOString() }
            : p
        ));
        toast.success('Post updated successfully');
      } else {
        // POST /api/admin/posts
        const newPost: Post = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toISOString()
        };
        setPosts([newPost, ...posts]);
        toast.success('Post created successfully');
      }

      setIsDialogOpen(false);
      setEditingPost(null);
      setFormData({ title: '', content: '', type: 'linkedin', image: '' });
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      // DELETE /api/admin/posts/{id}
      setPosts(posts.filter(p => p.id !== id));
      toast.success('Post deleted successfully');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      type: post.type,
      image: post.image || ''
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPost(null);
    setFormData({ title: '', content: '', type: 'linkedin', image: '' });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-white mb-2">Posts Management</h1>
          <p className="text-gray-400">Manage LinkedIn and Cross-Border posts from API or manually</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadPostsFromAPI}
            disabled={isLoadingPosts || !useApiPosts}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingPosts ? 'animate-spin' : ''}`} />
            Refresh from API
          </Button>
          <Button
            variant="outline"
            onClick={() => setUseApiPosts(!useApiPosts)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
          >
            {useApiPosts ? 'Switch to Manual' : 'Switch to API'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-pink-600 hover:bg-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#3d0f1f] border-white/20 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Post Type</Label>
                <PostTypeSelect
                  value={formData.type}
                  onChange={(type) => setFormData({ ...formData, type })}
                />
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Post title"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Post content..."
                  rows={4}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Image URL (optional)</Label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleDialogClose} className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-pink-600 hover:bg-pink-700">
                  {editingPost ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/10 text-white">
          <TabsTrigger value="all" className="text-white data-[state=active]:bg-pink-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            All Posts
          </TabsTrigger>
          <TabsTrigger value="corpay" className="text-white data-[state=active]:bg-pink-600 data-[state=active]:text-white">
            <Linkedin className="w-4 h-4 mr-2" />
            Corpay Posts
          </TabsTrigger>
          <TabsTrigger value="crossborder" className="text-white data-[state=active]:bg-pink-600 data-[state=active]:text-white">
            <Globe className="w-4 h-4 mr-2" />
            Cross-Border Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">All Posts</CardTitle>
                  <CardDescription className="text-gray-400">
                    {filteredPosts.length} total posts {useApiPosts ? '(from API)' : '(manual)'}
                  </CardDescription>
                </div>
                {useApiPosts && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">
                      API Mode
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 text-pink-500 animate-spin mr-2" />
                  <span className="text-white">Loading posts from API...</span>
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
                          No posts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPosts.map((post) => (
                        <TableRow key={post.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">
                            <span className={`px-2 py-1 rounded text-xs ${
                              post.type === 'linkedin' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                            }`}>
                              {post.type === 'linkedin' ? 'LinkedIn' : 'Cross-Border'}
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
                                onClick={() => handleEdit(post)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
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
        </TabsContent>

        <TabsContent value="corpay" className="mt-6">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Corpay Posts</CardTitle>
                  <CardDescription className="text-gray-400">
                    {filteredPosts.length} LinkedIn post(s) {useApiPosts ? '(from API)' : '(manual)'}
                  </CardDescription>
                </div>
                {useApiPosts && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">
                      API Mode
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 text-pink-500 animate-spin mr-2" />
                  <span className="text-white">Loading posts from API...</span>
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
                          No Corpay posts found
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
                                onClick={() => handleEdit(post)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
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
                    
                    const headers: Record<string, string> = {
                      'Content-Type': 'application/json',
                    };
                    if (token) {
                      headers['Authorization'] = `Bearer ${token}`;
                    }

                    // Process all URLs
                    const promises = validUrls.map(async (url) => {
                      try {
                        // Try dev endpoint first (no auth), then auth endpoint
                        try {
                          return await axios.post(
                            `${API_BASE_URL}/api/admin/posts/from-url-dev`,
                            {
                              post_url: url.trim(),
                              post_type: 'corpay'
                            },
                            {
                              headers: { 'Content-Type': 'application/json' },
                              timeout: 10000
                            }
                          );
                        } catch (devError: any) {
                          // Try with auth
                          return await axios.post(
                            `${API_BASE_URL}/api/admin/posts/from-url`,
                            {
                              post_url: url.trim(),
                              post_type: 'corpay'
                            },
                            {
                              headers,
                              timeout: 10000
                            }
                          );
                        }
                      } catch (error: any) {
                        console.error(`Error posting URL ${url}:`, error);
                        throw error;
                      }
                    });

                    await Promise.all(promises);
                    toast.success(`${validUrls.length} post(s) added successfully! They will appear in the dashboard.`);
                    setLinkedInPostUrls(['']);
                    
                    // Reload posts to show the new ones
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Cross-Border Posts</CardTitle>
                  <CardDescription className="text-gray-400">
                    {filteredPosts.length} Cross-Border post(s) {useApiPosts ? '(from API)' : '(manual)'}
                  </CardDescription>
                </div>
                {useApiPosts && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300">
                      API Mode
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 text-pink-500 animate-spin mr-2" />
                  <span className="text-white">Loading posts from API...</span>
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
                          No Cross-Border posts found
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
                                onClick={() => handleEdit(post)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
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
                    
                    const headers: Record<string, string> = {
                      'Content-Type': 'application/json',
                    };
                    if (token) {
                      headers['Authorization'] = `Bearer ${token}`;
                    }

                    // Process all URLs
                    const promises = validUrls.map(async (url) => {
                      try {
                        // Try dev endpoint first (no auth), then auth endpoint
                        try {
                          return await axios.post(
                            `${API_BASE_URL}/api/admin/posts/from-url-dev`,
                            {
                              post_url: url.trim(),
                              post_type: 'cross_border'
                            },
                            {
                              headers: { 'Content-Type': 'application/json' },
                              timeout: 10000
                            }
                          );
                        } catch (devError: any) {
                          // Try with auth
                          return await axios.post(
                            `${API_BASE_URL}/api/admin/posts/from-url`,
                            {
                              post_url: url.trim(),
                              post_type: 'cross_border'
                            },
                            {
                              headers,
                              timeout: 10000
                            }
                          );
                        }
                      } catch (error: any) {
                        console.error(`Error posting URL ${url}:`, error);
                        throw error;
                      }
                    });

                    await Promise.all(promises);
                    toast.success(`${validUrls.length} post(s) added successfully! They will appear in the dashboard.`);
                    setCrossBorderPostUrls(['']);
                    
                    // Reload posts to show the new ones
                    if (useApiPosts) {
                      loadPostsFromAPI();
                    }
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
