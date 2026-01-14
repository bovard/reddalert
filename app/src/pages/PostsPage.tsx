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
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--md-primary)' }} />
        </div>
      </Layout>
    );
  }

  if (posts.length === 0) {
    return (
      <Layout title="Reddalert">
        <NotificationPrompt userId={user?.uid} />
        {stats && stats.totalResponses > 0 && (
          <div
            className="rounded-2xl p-4 sm:p-5 mb-4 flex items-center gap-3 md-elevation-1"
            style={{ backgroundColor: 'var(--md-tertiary-container)' }}
          >
            <MessageCircle className="w-6 h-6" style={{ color: 'var(--md-on-tertiary-container)' }} />
            <div>
              <span className="font-bold text-lg" style={{ color: 'var(--md-on-tertiary-container)' }}>
                {stats.totalResponses}
              </span>
              <span className="ml-2" style={{ color: 'var(--md-on-tertiary-container)' }}>
                total responses
              </span>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: 'var(--md-surface-container-highest)' }}
          >
            <Inbox className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: 'var(--md-outline)' }} />
          </div>
          <h2 className="text-xl sm:text-2xl font-medium mb-2" style={{ color: 'var(--md-on-surface)' }}>
            All caught up!
          </h2>
          <p className="max-w-md" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
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
        <div
          className="rounded-2xl p-4 sm:p-5 mb-4 flex items-center gap-3 md-elevation-1"
          style={{ backgroundColor: 'var(--md-tertiary-container)' }}
        >
          <MessageCircle className="w-6 h-6" style={{ color: 'var(--md-on-tertiary-container)' }} />
          <div>
            <span className="font-bold text-lg" style={{ color: 'var(--md-on-tertiary-container)' }}>
              {stats.totalResponses}
            </span>
            <span className="ml-2" style={{ color: 'var(--md-on-tertiary-container)' }}>
              total responses
            </span>
          </div>
        </div>
      )}
      {/* Mobile: swipe instructions, Desktop: button instructions */}
      <p className="text-sm mb-4 md:hidden" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
        Swipe right after responding, left to dismiss
      </p>
      <p className="text-sm mb-4 hidden md:block" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
        Use the buttons to mark posts as responded or dismiss them
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
