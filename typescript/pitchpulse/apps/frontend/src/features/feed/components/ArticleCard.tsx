import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { Article } from '../api/feedApi';

interface ArticleCardProps {
  article: Article;
}

const TYPE_VARIANTS = {
  official: 'default' as const,
  rumor: 'secondary' as const,
  analysis: 'outline' as const,
  opinion: 'outline' as const,
};

export function ArticleCard({ article }: ArticleCardProps) {
  const reliabilityColor = article.reliability >= 70 ? 'text-green-600' : article.reliability >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="block">
        {article.imageUrl && (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          </div>
        )}
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={TYPE_VARIANTS[article.type]}>
              {article.type.toUpperCase()}
            </Badge>
            <span className={`text-xs font-medium ${reliabilityColor}`}>
              {article.reliability}% reliable
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {article.source}
            </span>
          </div>
          <CardTitle className="line-clamp-2">{article.title}</CardTitle>
          <CardDescription className="line-clamp-3">
            {article.summary}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(article.publishedAt).toLocaleDateString()} at{' '}
            {new Date(article.publishedAt).toLocaleTimeString()}
          </p>
        </CardContent>
      </a>
    </Card>
  );
}
