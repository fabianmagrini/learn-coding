import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuthStore } from '@/features/auth/store/authStore';
import { api } from '@/lib/api';

const PREMIER_LEAGUE_TEAMS = [
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
  'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich Town',
  'Leicester City', 'Liverpool', 'Manchester City', 'Manchester United',
  'Newcastle United', 'Nottingham Forest', 'Southampton', 'Tottenham',
  'West Ham', 'Wolverhampton'
];

const LEAGUES = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Champions League',
  'Europa League'
];

export function Onboarding() {
  const navigate = useNavigate();
  const setOnboarded = useAuthStore((state) => state.setOnboarded);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(['Premier League']);

  const onboardingMutation = useMutation({
    mutationFn: async (data: { teams: string[]; leagues: string[] }) => {
      const response = await api.post('/api/user/onboarding', data);
      return response.data;
    },
    onSuccess: () => {
      setOnboarded(selectedTeams, selectedLeagues);
      navigate('/feed');
    },
  });

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) =>
      prev.includes(team)
        ? prev.filter((t) => t !== team)
        : [...prev, team]
    );
  };

  const toggleLeague = (league: string) => {
    setSelectedLeagues((prev) =>
      prev.includes(league)
        ? prev.filter((l) => l !== league)
        : [...prev, league]
    );
  };

  const handleSubmit = () => {
    if (selectedTeams.length > 0 && selectedLeagues.length > 0) {
      onboardingMutation.mutate({
        teams: selectedTeams,
        leagues: selectedLeagues,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome to PitchPulse</h1>
          <p className="mt-2 text-muted-foreground">
            Let's personalize your football news feed
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Your Favorite Teams</CardTitle>
            <CardDescription>
              Choose at least one team to follow (Premier League)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {PREMIER_LEAGUE_TEAMS.map((team) => (
                <Button
                  key={team}
                  variant={selectedTeams.includes(team) ? 'default' : 'outline'}
                  onClick={() => toggleTeam(team)}
                  className="h-auto py-3"
                >
                  {team}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Leagues to Follow</CardTitle>
            <CardDescription>
              Choose the competitions you want to track
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LEAGUES.map((league) => (
                <Button
                  key={league}
                  variant={selectedLeagues.includes(league) ? 'default' : 'outline'}
                  onClick={() => toggleLeague(league)}
                  className="h-auto py-3"
                >
                  {league}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={selectedTeams.length === 0 || selectedLeagues.length === 0 || onboardingMutation.isPending}
          >
            {onboardingMutation.isPending ? 'Setting up...' : 'Continue to Feed'}
          </Button>
        </div>
      </div>
    </div>
  );
}
