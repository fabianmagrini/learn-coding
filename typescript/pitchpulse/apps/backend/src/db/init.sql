-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    league VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User favorite teams (many-to-many)
CREATE TABLE IF NOT EXISTS user_favorite_teams (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, team_id)
);

-- User favorite leagues (many-to-many)
CREATE TABLE IF NOT EXISTS user_favorite_leagues (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, league_id)
);

-- News sources table
CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    url VARCHAR(500) NOT NULL,
    rss_url VARCHAR(500),
    reliability_score INTEGER CHECK (reliability_score >= 0 AND reliability_score <= 100),
    tier INTEGER CHECK (tier >= 1 AND tier <= 4),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    source_id UUID REFERENCES news_sources(id),
    source_url TEXT NOT NULL,
    image_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    article_type VARCHAR(50) CHECK (article_type IN ('official', 'rumor', 'analysis', 'opinion')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Article tags (for teams, players, managers)
CREATE TABLE IF NOT EXISTS article_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    tag_type VARCHAR(50) CHECK (tag_type IN ('team', 'player', 'manager', 'league')),
    tag_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_value ON article_tags(tag_value);
CREATE INDEX IF NOT EXISTS idx_user_favorite_teams_user_id ON user_favorite_teams(user_id);

-- Insert default Premier League teams
INSERT INTO teams (name, league, country) VALUES
    ('Arsenal', 'Premier League', 'England'),
    ('Aston Villa', 'Premier League', 'England'),
    ('Bournemouth', 'Premier League', 'England'),
    ('Brentford', 'Premier League', 'England'),
    ('Brighton', 'Premier League', 'England'),
    ('Chelsea', 'Premier League', 'England'),
    ('Crystal Palace', 'Premier League', 'England'),
    ('Everton', 'Premier League', 'England'),
    ('Fulham', 'Premier League', 'England'),
    ('Ipswich Town', 'Premier League', 'England'),
    ('Leicester City', 'Premier League', 'England'),
    ('Liverpool', 'Premier League', 'England'),
    ('Manchester City', 'Premier League', 'England'),
    ('Manchester United', 'Premier League', 'England'),
    ('Newcastle United', 'Premier League', 'England'),
    ('Nottingham Forest', 'Premier League', 'England'),
    ('Southampton', 'Premier League', 'England'),
    ('Tottenham', 'Premier League', 'England'),
    ('West Ham', 'Premier League', 'England'),
    ('Wolverhampton', 'Premier League', 'England')
ON CONFLICT (name) DO NOTHING;

-- Insert default leagues
INSERT INTO leagues (name, country) VALUES
    ('Premier League', 'England'),
    ('La Liga', 'Spain'),
    ('Serie A', 'Italy'),
    ('Bundesliga', 'Germany'),
    ('Ligue 1', 'France'),
    ('Champions League', 'Europe'),
    ('Europa League', 'Europe')
ON CONFLICT (name) DO NOTHING;

-- Insert sample news sources
INSERT INTO news_sources (name, url, rss_url, reliability_score, tier, is_active) VALUES
    ('BBC Sport', 'https://www.bbc.com/sport/football', 'https://feeds.bbci.co.uk/sport/football/rss.xml', 95, 2, true),
    ('Sky Sports', 'https://www.skysports.com/football', 'https://www.skysports.com/rss/12040', 90, 2, true),
    ('The Athletic', 'https://theathletic.com/football/', null, 92, 2, true),
    ('ESPN FC', 'https://www.espn.com/soccer/', 'https://www.espn.com/espn/rss/soccer/news', 88, 2, true),
    ('Goal.com', 'https://www.goal.com/', 'https://www.goal.com/en/feeds/news?fmt=rss&id=13', 75, 3, true)
ON CONFLICT (name) DO NOTHING;
