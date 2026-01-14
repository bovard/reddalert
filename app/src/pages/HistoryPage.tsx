import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { useRespondedPosts, useUserStats } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';
import { MessageCircle, Loader2 } from 'lucide-react';

export function HistoryPage() {
  const { user } = useAuth();
  const { posts, loading } = useRespondedPosts(user?.uid);
  const { stats } = useUserStats(user?.uid);

  if (loading) {
    return (
      <Layout title="Responses">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (posts.length === 0) {
    return (
      <Layout title="Responses">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageCircle className="w-16 h-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-medium text-gray-300 mb-2">No responses yet</h2>
          <p className="text-gray-500">
            Posts you respond to will appear here.<br />
            Swipe right after commenting on a post.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Responses">
      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4 flex items-center gap-3">
        <MessageCircle className="w-6 h-6 text-green-400" />
        <div>
          <span className="text-green-400 font-bold text-lg">{stats?.totalResponses ?? posts.length}</span>
          <span className="text-green-300 ml-2">total responses</span>
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        {posts.length} post{posts.length !== 1 ? 's' : ''} you've responded to
      </p>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDismiss={() => {}}
          onMarkResponded={() => {}}
          showActions={false}
        />
      ))}
    </Layout>
  );
}
