import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { NotificationPrompt } from '../components/NotificationPrompt';
import { usePosts, useUpdatePostStatus, useUserStats } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';
import { Inbox, Loader2, MessageCircle } from 'lucide-react';

export function PostsPage() {
  const { user } = useAuth();
  const { posts, loading } = usePosts(user?.uid, 'new');
  const { stats } = useUserStats(user?.uid);
  const updateStatus = useUpdatePostStatus(user?.uid);

  if (loading) {
    return (
      <Layout title="Reddalert">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (posts.length === 0) {
    return (
      <Layout title="Reddalert">
        <NotificationPrompt userId={user?.uid} />
        {stats && stats.totalResponses > 0 && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4 flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-green-400" />
            <div>
              <span className="text-green-400 font-bold text-lg">{stats.totalResponses}</span>
              <span className="text-green-300 ml-2">total responses</span>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="w-16 h-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-medium text-gray-300 mb-2">All caught up!</h2>
          <p className="text-gray-500">
            No new posts from Catan subreddits.<br />
            Check back later for new discussions.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reddalert">
      <NotificationPrompt userId={user?.uid} />
      {stats && stats.totalResponses > 0 && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4 flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-green-400" />
          <div>
            <span className="text-green-400 font-bold text-lg">{stats.totalResponses}</span>
            <span className="text-green-300 ml-2">total responses</span>
          </div>
        </div>
      )}
      <p className="text-gray-400 text-sm mb-4">
        Swipe right after responding, left to dismiss
      </p>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDismiss={() => updateStatus.mutate({ postId: post.id, status: 'dismissed' })}
          onMarkResponded={() => updateStatus.mutate({ postId: post.id, status: 'responded' })}
        />
      ))}
    </Layout>
  );
}
