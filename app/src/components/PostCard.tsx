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
    trackMouse: false, // Disable mouse tracking - use buttons on desktop
    preventScrollOnSwipe: true,
  });

  const getRedditUrl = () => {
    // Handle malformed URLs like "https//..." (missing colon)
    if (post.permalink.startsWith('https//')) {
      return post.permalink.replace('https//', 'https://');
    }
    if (post.permalink.startsWith('http//')) {
      return post.permalink.replace('http//', 'http://');
    }
    if (post.permalink.startsWith('http')) {
      return post.permalink;
    }
    return `https://reddit.com${post.permalink}`;
  };

  const openInReddit = () => {
    window.open(getRedditUrl(), '_blank');
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
    <div className="relative overflow-hidden rounded-2xl mb-4 md-elevation-1">
      {/* Swipe backgrounds - mobile only */}
      {showActions && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-full flex items-center px-5 md:hidden"
            style={{
              backgroundColor: 'var(--md-tertiary-container)',
              opacity: swipeOffset > 0 ? Math.min(swipeOffset / 100, 1) : 0,
            }}
          >
            <Check className="w-7 h-7" style={{ color: 'var(--md-on-tertiary-container)' }} />
            <span className="ml-3 font-medium" style={{ color: 'var(--md-on-tertiary-container)' }}>
              Responded
            </span>
          </div>
          <div
            className="absolute inset-y-0 right-0 w-full flex items-center justify-end px-5 md:hidden"
            style={{
              backgroundColor: 'var(--md-error-container)',
              opacity: swipeOffset < 0 ? Math.min(-swipeOffset / 100, 1) : 0,
            }}
          >
            <span className="mr-3 font-medium" style={{ color: 'var(--md-on-error-container)' }}>
              Dismiss
            </span>
            <X className="w-7 h-7" style={{ color: 'var(--md-on-error-container)' }} />
          </div>
        </>
      )}

      {/* Card content */}
      <div
        {...handlers}
        className="relative md:cursor-default cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: 'var(--md-surface-container-high)',
          transform: `translateX(${swipeOffset}px)`,
          transition: isAnimating ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm mb-2 flex-wrap" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
                <span className="font-medium" style={{ color: 'var(--md-primary)' }}>
                  r/{post.subreddit}
                </span>
                <span style={{ color: 'var(--md-outline)' }}>•</span>
                <span>u/{post.author}</span>
                <span style={{ color: 'var(--md-outline)' }}>•</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
              <a
                href={getRedditUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base sm:text-lg font-medium leading-snug hover:underline block"
                style={{ color: 'var(--md-on-surface)' }}
              >
                {post.title}
              </a>
            </div>
            <button
              onClick={openInReddit}
              className="flex-shrink-0 p-2.5 rounded-full transition-colors md-state-layer"
              style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
              aria-label="Open in Reddit"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>

          {/* Actions row - show buttons on desktop, hint on mobile */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={toggleExpand}
              disabled={isPending}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--md-primary)' }}
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

            {/* Desktop action buttons */}
            {showActions && (
              <div className="hidden md:flex items-center gap-2 ml-auto">
                <button
                  onClick={onMarkResponded}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--md-tertiary-container)',
                    color: 'var(--md-on-tertiary-container)',
                  }}
                >
                  <Check className="w-4 h-4" />
                  <span>Responded</span>
                </button>
                <button
                  onClick={onDismiss}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors md-state-layer"
                  style={{
                    backgroundColor: 'var(--md-surface-container-highest)',
                    color: 'var(--md-on-surface)',
                  }}
                >
                  <X className="w-4 h-4" />
                  <span>Dismiss</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && details && (
          <div
            className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3"
            style={{ borderTop: '1px solid var(--md-outline-variant)' }}
          >
            {/* Stats row */}
            <div className="flex items-center gap-4 sm:gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <ArrowUp className="w-4 h-4" style={{ color: 'var(--md-tertiary)' }} />
                <span className="font-medium" style={{ color: 'var(--md-tertiary)' }}>
                  {formatScore(details.score)}
                </span>
                <span style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
                  ({Math.round(details.upvoteRatio * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" style={{ color: 'var(--md-secondary)' }} />
                <span className="font-medium" style={{ color: 'var(--md-secondary)' }}>
                  {details.numComments}
                </span>
                <span style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
                  comments
                </span>
              </div>
              {details.flair && (
                <span
                  className="px-2.5 py-1 text-xs rounded-full font-medium"
                  style={{
                    backgroundColor: 'var(--md-secondary-container)',
                    color: 'var(--md-on-secondary-container)',
                  }}
                >
                  {details.flair}
                </span>
              )}
            </div>

            {/* Fetched timestamp and refresh button */}
            <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
              <span>Updated {formatFetchedAt(details.fetchedAt)}</span>
              {detailsAreStale && (
                <button
                  onClick={handleRefresh}
                  disabled={isPending}
                  className="flex items-center gap-1 font-medium transition-colors"
                  style={{ color: 'var(--md-primary)' }}
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

            {/* Content layout - side by side on larger screens */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              {/* Thumbnail */}
              {details.thumbnail && (
                <div className="flex-shrink-0">
                  <img
                    src={details.thumbnail}
                    alt=""
                    className="rounded-xl max-h-44 sm:max-h-48 sm:max-w-[200px] object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Self text preview */}
              {details.selftext && (
                <div
                  className="flex-1 text-sm leading-relaxed line-clamp-4 sm:line-clamp-6 whitespace-pre-wrap"
                  style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
                >
                  {details.selftext.slice(0, 500)}
                  {details.selftext.length > 500 && '...'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
