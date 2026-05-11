'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Trash2, X } from 'lucide-react';

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
    <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-outfit font-bold mb-4" style={{
            background: 'linear-gradient(110deg, #C4B5FD, #A78BFA)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
          }}>
            Community
          </h1>
          <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
            Connect with fans, share experiences, and join the conversation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post Card */}
            {user && (
              <div className="rounded-2xl border p-6 transition-all" style={{
                backgroundColor: '#15121D',
                borderColor: 'rgba(196, 181, 253, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
              }}
              >
                {!showCreatePost ? (
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="w-full text-left px-4 py-3 rounded-full transition-all font-inter"
                    style={{
                      backgroundColor: '#1E1A2B',
                      color: '#9B95B5',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2A2636';
                      e.currentTarget.style.color = '#C4B5FD';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1E1A2B';
                      e.currentTarget.style.color = '#9B95B5';
                    }}
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
                      className="w-full px-4 py-3 rounded-2xl resize-none outline-none font-inter text-sm"
                      style={{
                        backgroundColor: '#1E1A2B',
                        border: '1px solid rgba(196, 181, 253, 0.12)',
                        color: '#F5F3FA',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(167, 139, 250, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    
                    <input
                      type="text"
                      value={newPostImage}
                      onChange={(e) => setNewPostImage(e.target.value)}
                      placeholder="Image URL (optional)"
                      className="w-full px-4 py-2 rounded-full outline-none font-inter text-sm"
                      style={{
                        backgroundColor: '#1E1A2B',
                        border: '1px solid rgba(196, 181, 253, 0.12)',
                        color: '#F5F3FA',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                      }}
                    />
                    
                    <input
                      type="text"
                      value={newPostTags}
                      onChange={(e) => setNewPostTags(e.target.value)}
                      placeholder="Tags (comma separated, e.g. music, events, live)"
                      className="w-full px-4 py-2 rounded-full outline-none font-inter text-sm"
                      style={{
                        backgroundColor: '#1E1A2B',
                        border: '1px solid rgba(196, 181, 253, 0.12)',
                        color: '#F5F3FA',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                      }}
                    />
                    
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-6 py-2 rounded-full font-semibold transition-all font-inter"
                        style={{
                          backgroundColor: '#A78BFA',
                          color: '#07060A',
                        }}
                        onMouseEnter={(e) => {
                          if (!creating) {
                            e.currentTarget.style.backgroundColor = '#B8A4FF';
                            e.currentTarget.style.boxShadow = '0 12px 40px rgba(167, 139, 250, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#A78BFA';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
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
                        className="px-6 py-2 rounded-full font-semibold transition-all font-inter border"
                        style={{
                          backgroundColor: '#1E1A2B',
                          borderColor: 'rgba(196, 181, 253, 0.1)',
                          color: '#F5F3FA',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2A2636';
                          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1E1A2B';
                          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                        }}
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
                <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
                  borderColor: 'rgba(167, 139, 250, 0.3)',
                  borderTopColor: '#A78BFA',
                }} />
                <p className="font-inter" style={{ color: '#9B95B5' }}>Loading posts...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 rounded-lg font-inter border" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.28)',
                color: '#ef4444',
              }}>
                {error}
              </div>
            )}

            {/* Posts */}
            {!loading && !error && (
              <>
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border" style={{
                    backgroundColor: '#15121D',
                    borderColor: 'rgba(196, 181, 253, 0.1)',
                  }}>
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>No posts yet</p>
                    <p className="text-sm font-inter mt-2" style={{ color: 'rgba(155, 149, 181, 0.7)' }}>
                      Be the first to share something!
                    </p>
                  </div>
                ) : (
                  filteredPosts.map((post) => {
                    const isLiked = user && post.likes.includes(user.id);
                    const isAuthor = user && post.author._id === user.id;

                    return (
                      <div key={post._id} className="rounded-2xl border p-6 transition-all" style={{
                        backgroundColor: '#15121D',
                        borderColor: 'rgba(196, 181, 253, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                      }}
                      >
                        {/* Post Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold" style={{
                              background: 'linear-gradient(135deg, #A78BFA, #C4B5FD)',
                            }}>
                              {getInitials(post.author.name)}
                            </div>
                            <div>
                              <h4 className="font-semibold font-inter" style={{ color: '#F5F3FA' }}>{post.author.name}</h4>
                              <p className="text-sm font-inter" style={{ color: '#9B95B5' }}>
                                {formatTimeAgo(post.createdAt)}
                                {post.edited && ' • Edited'}
                              </p>
                            </div>
                          </div>
                          
                          {isAuthor && (
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="transition-colors"
                              style={{ color: '#9B95B5' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>

                        {/* Post Content */}
                        <p className="whitespace-pre-wrap mb-4 font-inter" style={{ color: '#C4B5FD' }}>{post.content}</p>

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
                                className="px-2.5 py-1 rounded-full text-sm transition-all font-inter"
                                style={{
                                  backgroundColor: 'rgba(196, 181, 253, 0.1)',
                                  color: '#A78BFA',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(196, 181, 253, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(196, 181, 253, 0.1)';
                                }}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Post Actions */}
                        <div className="flex items-center gap-6 text-sm font-inter" style={{
                          borderTop: '1px solid rgba(196, 181, 253, 0.1)',
                          paddingTop: '16px',
                          color: '#9B95B5',
                        }}>
                          <button
                            onClick={() => handleLikePost(post._id)}
                            className="flex items-center gap-2 transition-colors"
                            style={{
                              color: isLiked ? '#A78BFA' : '#9B95B5',
                            }}
                            onMouseEnter={(e) => {
                              if (!isLiked) {
                                e.currentTarget.style.color = '#A78BFA';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isLiked) {
                                e.currentTarget.style.color = '#9B95B5';
                              }
                            }}
                          >
                            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                            <span>{post.likes.length}</span>
                          </button>

                          <button
                            onClick={() => setCommentingOn(commentingOn === post._id ? null : post._id)}
                            className="flex items-center gap-2 transition-colors"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#A78BFA';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#9B95B5';
                            }}
                          >
                            <MessageCircle size={18} />
                            <span>{post.comments.length}</span>
                          </button>
                        </div>

                        {/* Comments Section */}
                        {post.comments.length > 0 && (
                          <div className="mt-4 space-y-3" style={{
                            borderTop: '1px solid rgba(196, 181, 253, 0.1)',
                            paddingTop: '16px',
                          }}>
                            {post.comments.map((comment) => (
                              <div key={comment._id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{
                                  background: 'linear-gradient(135deg, #FF7AC6, #F0A6F8)',
                                }}>
                                  {getInitials(comment.author.name)}
                                </div>
                                <div className="flex-1">
                                  <div className="rounded-lg px-4 py-2" style={{ backgroundColor: '#1E1A2B' }}>
                                    <div className="font-semibold text-sm mb-1 font-inter" style={{ color: '#F5F3FA' }}>{comment.author.name}</div>
                                    <p className="text-sm font-inter" style={{ color: '#C4B5FD' }}>{comment.content}</p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs font-inter" style={{ color: '#9B95B5' }}>
                                    <span>{formatTimeAgo(comment.createdAt)}</span>
                                    <button className="hover:text-pink-400 transition-colors">
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
                              className="flex-1 px-4 py-2 rounded-full outline-none font-inter text-sm"
                              style={{
                                backgroundColor: '#1E1A2B',
                                border: '1px solid rgba(196, 181, 253, 0.12)',
                                color: '#F5F3FA',
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                              }}
                            />
                            <button
                              onClick={() => handleAddComment(post._id)}
                              className="px-4 py-2 rounded-full font-semibold transition-all font-inter"
                              style={{
                                backgroundColor: '#A78BFA',
                                color: '#07060A',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#B8A4FF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#A78BFA';
                              }}
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
            <div className="rounded-2xl border p-6 sticky top-24 transition-all" style={{
              backgroundColor: '#15121D',
              borderColor: 'rgba(196, 181, 253, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
            }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2 font-inter" style={{ color: '#F5F3FA' }}>
                  <span>🔥</span>
                  Trending Tags
                </h3>
                {selectedTag && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-inter transition-colors"
                    style={{ color: '#A78BFA' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#C4B5FD')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#A78BFA')}
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedTag && (
                <div className="mb-3 px-3 py-2 rounded-full text-sm font-inter" style={{
                  backgroundColor: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.28)',
                  color: '#A78BFA',
                }}>
                  <span>Showing posts tagged:</span>
                  <span className="font-semibold ml-2">#{selectedTag}</span>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedTag('')}
                  className="block w-full text-left px-3 py-2 rounded-lg transition-colors font-inter"
                  style={{
                    backgroundColor: selectedTag === '' ? '#A78BFA' : 'transparent',
                    color: selectedTag === '' ? '#07060A' : '#9B95B5',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTag !== '') {
                      e.currentTarget.style.backgroundColor = 'rgba(196, 181, 253, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTag !== '') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  All Posts
                </button>
                {trendingTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className="block w-full text-left px-3 py-2 rounded-lg transition-colors font-inter"
                    style={{
                      backgroundColor: selectedTag === tag ? '#A78BFA' : 'transparent',
                      color: selectedTag === tag ? '#07060A' : '#A78BFA',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTag !== tag) {
                        e.currentTarget.style.backgroundColor = 'rgba(196, 181, 253, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTag !== tag) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Community Stats */}
            <div className="rounded-2xl border p-6 transition-all" style={{
              backgroundColor: '#15121D',
              borderColor: 'rgba(196, 181, 253, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
            }}
            >
              <h3 className="font-semibold mb-4 font-inter" style={{ color: '#F5F3FA' }}>Community Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-inter">
                  <span style={{ color: '#9B95B5' }}>Total Posts</span>
                  <span style={{ color: '#C4B5FD' }} className="font-semibold">{filteredPosts.length}</span>
                </div>
                <div className="flex justify-between text-sm font-inter">
                  <span style={{ color: '#9B95B5' }}>Active Today</span>
                  <span style={{ color: '#A78BFA' }} className="font-semibold">
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
