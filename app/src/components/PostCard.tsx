import { useSwipeable } from 'react-swipeable';
import { ExternalLink, Check, X, ChevronDown, ChevronUp, ArrowUp, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import type { Post } from '../types';
import { useState } from 'react';
import { usePostDetails, extractPostId, isStale, formatFetchedAt } from '../hooks/usePostDetails';
import type { PostDetailsWithTimestamp } from '../hooks/usePostDetails';

interface PostCardProps {
  post: Post;
  onDismiss: () => void;
  onMarkResponded: () => void;
  showActions?: boolean;
}

export function PostCard({ post, onDismiss, onMarkResponded, showActions = true }: PostCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [details, setDetails] = useState<PostDetailsWithTimestamp | null>(null);

  const { mutate: fetchDetails, isPending } = usePostDetails();

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (!showActions) return;
      setSwipeOffset(eventData.deltaX);
    },
    onSwipedLeft: () => {
      if (!showActions) return;
      setIsAnimating(true);
      setSwipeOffset(-300);
      setTimeout(() => {
        onDismiss();
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 200);
    },
    onSwipedRight: () => {
      if (!showActions) return;
      setIsAnimating(true);
      setSwipeOffset(300);
      setTimeout(() => {
        onMarkResponded();
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 200);
    },
    onSwiped: () => {
      if (Math.abs(swipeOffset) < 100) {
        setSwipeOffset(0);
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const openInReddit = () => {
    window.open(`https://reddit.com${post.permalink}`, '_blank');
  };

  const fetchPostDetails = (forceRefresh = false) => {
    const postId = extractPostId(post.redditId);
    fetchDetails(
      { subreddit: post.subreddit, postId, forceRefresh },
      {
        onSuccess: (data) => {
          setDetails(data);
          setIsExpanded(true);
        },
      }
    );
  };

  const toggleExpand = () => {
    if (!isExpanded && !details) {
      fetchPostDetails(false);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleRefresh = () => {
    fetchPostDetails(true);
  };

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatScore = (score: number) => {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`;
    }
    return score.toString();
  };

  const detailsAreStale = details ? isStale(details.fetchedAt) : false;

  return (
    <div className="relative overflow-hidden rounded-lg mb-3">
      {/* Swipe backgrounds */}
      {showActions && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-full bg-green-600 flex items-center px-4"
            style={{ opacity: swipeOffset > 0 ? Math.min(swipeOffset / 100, 1) : 0 }}
          >
            <Check className="w-6 h-6 text-white" />
            <span className="ml-2 text-white font-medium">Responded</span>
          </div>
          <div
            className="absolute inset-y-0 right-0 w-full bg-red-600 flex items-center justify-end px-4"
            style={{ opacity: swipeOffset < 0 ? Math.min(-swipeOffset / 100, 1) : 0 }}
          >
            <span className="mr-2 text-white font-medium">Dismiss</span>
            <X className="w-6 h-6 text-white" />
          </div>
        </>
      )}

      {/* Card content */}
      <div
        {...handlers}
        className="bg-gray-800 relative cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isAnimating ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <span className="text-red-400 font-medium">r/{post.subreddit}</span>
                <span>·</span>
                <span>u/{post.author}</span>
                <span>·</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
              <h3 className="text-white font-medium leading-tight">{post.title}</h3>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={openInReddit}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Open in Reddit"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expand button */}
          <button
            onClick={toggleExpand}
            disabled={isPending}
            className="mt-3 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{isPending ? 'Loading...' : isExpanded ? 'Show less' : 'Show details'}</span>
          </button>
        </div>

        {/* Expanded details */}
        {isExpanded && details && (
          <div className="px-4 pb-4 border-t border-gray-700">
            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
              <div className="flex items-center gap-1 text-orange-400">
                <ArrowUp className="w-4 h-4" />
                <span className="font-medium">{formatScore(details.score)}</span>
                <span className="text-gray-500">({Math.round(details.upvoteRatio * 100)}%)</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{details.numComments}</span>
                <span className="text-gray-500">comments</span>
              </div>
              {details.flair && (
                <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                  {details.flair}
                </span>
              )}
            </div>

            {/* Fetched timestamp and refresh button */}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>Updated {formatFetchedAt(details.fetchedAt)}</span>
              {detailsAreStale && (
                <button
                  onClick={handleRefresh}
                  disabled={isPending}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>Refresh</span>
                </button>
              )}
            </div>

            {/* Thumbnail */}
            {details.thumbnail && (
              <div className="mt-3">
                <img
                  src={details.thumbnail}
                  alt=""
                  className="rounded max-h-40 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Self text preview */}
            {details.selftext && (
              <div className="mt-3 text-sm text-gray-300 line-clamp-4 whitespace-pre-wrap">
                {details.selftext.slice(0, 500)}
                {details.selftext.length > 500 && '...'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
