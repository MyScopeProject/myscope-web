'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Comment {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  likes: string[];
  createdAt: string;
}

interface Post {
  _id: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  mediaUrl?: string;
  mediaType: string;
  likes: string[];
  comments: Comment[];
  tags: string[];
  pinned: boolean;
  edited: boolean;
  editedAt?: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  // Create post form state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Comment state
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

  const trendingTags = ['music', 'events', 'concerts', 'liveshow', 'community', 'newrelease'];

  useEffect(() => {
    fetchPosts();
  }, [selectedTag]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (selectedTag) params.append('tag', selectedTag);
      
      const url = `${API_URL}/api/community?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setPosts(data.data.posts || []);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      setError('Error fetching posts');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedTag('');
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!newPostContent.trim()) {
      alert('Please enter post content');
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      
      const tags = newPostTags
        .split(',')
        .map(tag => tag.trim().toLowerCase().replace(/^#/, ''))
        .filter(tag => tag.length > 0);

      const response = await fetch(`${API_URL}/api/community`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newPostContent,
          mediaUrl: newPostImage,
          mediaType: newPostImage ? 'image' : 'none',
          tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewPostContent('');
        setNewPostTags('');
        setNewPostImage('');
        setShowCreatePost(false);
        fetchPosts();
      } else {
        alert(data.message || 'Failed to create post');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error creating post');
    } finally {
      setCreating(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/community/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Update post in state
        setPosts(posts.map(post => 
          post._id === postId ? data.data.post : post
        ));
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/community/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (data.success) {
        setPosts(posts.map(post => 
          post._id === postId ? data.data.post : post
        ));
        setCommentInputs({ ...commentInputs, [postId]: '' });
        setCommentingOn(null);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/community/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPosts(posts.filter(post => post._id !== postId));
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredPosts = Array.isArray(posts) ? posts : [];

  return (
    <div className="pt-16 min-h-screen pb-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Community
          </h1>
          <p className="text-gray-400 text-lg">
            Connect with fans, share experiences, and join the conversation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post Card */}
            {user && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                {!showCreatePost ? (
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400 transition-colors"
                  >
                    What's on your mind, {user.name}?
                  </button>
                ) : (
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                    />
                    
                    <input
                      type="text"
                      value={newPostImage}
                      onChange={(e) => setNewPostImage(e.target.value)}
                      placeholder="Image URL (optional)"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                    
                    <input
                      type="text"
                      value={newPostTags}
                      onChange={(e) => setNewPostTags(e.target.value)}
                      placeholder="Tags (comma separated, e.g. music, events, live)"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                    
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                      >
                        {creating ? 'Posting...' : 'Post'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreatePost(false);
                          setNewPostContent('');
                          setNewPostImage('');
                          setNewPostTags('');
                        }}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading posts...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Posts */}
            {!loading && !error && (
              <>
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-gray-400 text-lg">No posts yet</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Be the first to share something!
                    </p>
                  </div>
                ) : (
                  filteredPosts.map((post) => {
                    const isLiked = user && post.likes.includes(user.id);
                    const isAuthor = user && post.author._id === user.id;

                    return (
                      <div key={post._id} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        {/* Post Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-linear-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {getInitials(post.author.name)}
                            </div>
                            <div>
                              <h4 className="font-semibold">{post.author.name}</h4>
                              <p className="text-sm text-gray-400">
                                {formatTimeAgo(post.createdAt)}
                                {post.edited && ' • Edited'}
                              </p>
                            </div>
                          </div>
                          
                          {isAuthor && (
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Post Content */}
                        <p className="text-gray-300 whitespace-pre-wrap mb-4">{post.content}</p>

                        {/* Post Image */}
                        {post.mediaUrl && post.mediaType === 'image' && (
                          <div className="mb-4 rounded-lg overflow-hidden">
                            <img
                              src={post.mediaUrl}
                              alt="Post media"
                              className="w-full max-h-96 object-cover"
                            />
                          </div>
                        )}

                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag, index) => (
                              <button
                                key={index}
                                onClick={() => setSelectedTag(tag)}
                                className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-green-400 text-sm rounded-full transition-colors"
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Post Actions */}
                        <div className="flex items-center gap-6 text-gray-400 border-t border-gray-700 pt-4">
                          <button
                            onClick={() => handleLikePost(post._id)}
                            className={`flex items-center gap-2 hover:text-green-400 transition-colors ${
                              isLiked ? 'text-green-400' : ''
                            }`}
                          >
                            <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>{post.likes.length}</span>
                          </button>

                          <button
                            onClick={() => setCommentingOn(commentingOn === post._id ? null : post._id)}
                            className="flex items-center gap-2 hover:text-green-400 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{post.comments.length}</span>
                          </button>
                        </div>

                        {/* Comments Section */}
                        {post.comments.length > 0 && (
                          <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                            {post.comments.map((comment) => (
                              <div key={comment._id} className="flex gap-3">
                                <div className="w-8 h-8 bg-linear-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                  {getInitials(comment.author.name)}
                                </div>
                                <div className="flex-1">
                                  <div className="bg-gray-700 rounded-lg px-4 py-2">
                                    <div className="font-semibold text-sm mb-1">{comment.author.name}</div>
                                    <p className="text-gray-300 text-sm">{comment.content}</p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                    <span>{formatTimeAgo(comment.createdAt)}</span>
                                    <button className="hover:text-green-400">
                                      ❤️ {comment.likes.length}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment Input */}
                        {commentingOn === post._id && (
                          <div className="mt-4 flex gap-2">
                            <input
                              type="text"
                              value={commentInputs[post._id] || ''}
                              onChange={(e) => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post._id)}
                              placeholder="Write a comment..."
                              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            />
                            <button
                              onClick={() => handleAddComment(post._id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Tags */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <span>🔥</span>
                  Trending Tags
                </h3>
                {selectedTag && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedTag && (
                <div className="mb-3 px-3 py-2 bg-green-600/20 border border-green-600/30 rounded-lg text-sm">
                  <span className="text-green-400">Showing posts tagged:</span>
                  <span className="text-white font-semibold ml-2">#{selectedTag}</span>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedTag('')}
                  className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedTag === '' 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  All Posts
                </button>
                {trendingTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedTag === tag 
                        ? 'bg-green-600 text-white' 
                        : 'text-green-400 hover:bg-gray-700'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Community Stats */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="font-semibold mb-4">Community Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Posts</span>
                  <span className="font-semibold">{filteredPosts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Active Today</span>
                  <span className="font-semibold text-green-400">
                    {filteredPosts.filter(p => {
                      const postDate = new Date(p.createdAt);
                      const today = new Date();
                      return postDate.toDateString() === today.toDateString();
                    }).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
