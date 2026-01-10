import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { useAuthStore } from '@/features/auth/store/authStore';
import { feedApi } from '../api/feedApi';
import { ArticleCard } from '../components/ArticleCard';

export function Feed() {
  const { user, logout } = useAuthStore();

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['feed', 'personalized'],
    queryFn: feedApi.getPersonalizedFeed,
    refetchInterval: 60000, // Refetch every minute
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PitchPulse</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.username}
              </p>
            </div>
            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Your Personalized Feed</h2>
          <p className="text-muted-foreground">
            Latest news from your favorite teams
          </p>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your feed...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load feed. Please try again.</p>
          </div>
        )}

        {articles && articles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No articles yet. Check back soon!</p>
          </div>
        )}

        {articles && articles.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
