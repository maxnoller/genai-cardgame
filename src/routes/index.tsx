import { createFileRoute } from '@tanstack/react-router';
import { Authenticated, Unauthenticated, useMutation, useQuery } from 'convex/react';
import { useAuth } from '@workos/authkit-tanstack-react-start/client';
import { getAuth, getSignInUrl, getSignUpUrl } from '@workos/authkit-tanstack-react-start';
import type { User } from '@workos/authkit-tanstack-react-start';
import { api } from '../../convex/_generated/api';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => {
    const { user } = await getAuth();
    const signInUrl = await getSignInUrl();
    const signUpUrl = await getSignUpUrl();

    return { user, signInUrl, signUpUrl };
  },
});

function Home() {
  const { user, signInUrl, signUpUrl } = Route.useLoaderData();
  return <HomeContent user={user} signInUrl={signInUrl} signUpUrl={signUpUrl} />;
}

function HomeContent({ user, signInUrl, signUpUrl }: { user: User | null; signInUrl: string; signUpUrl: string }) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <h1 className="text-xl font-bold">GenAI Card Game</h1>
        {user && <UserMenu user={user} />}
      </header>
      <main className="p-8 flex flex-col gap-8 items-center">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">GenAI Card Game</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            An AI-generated MTG-like card game where every card is unique, created in real-time by AI.
          </p>
        </div>

        <Authenticated>
          <GameLobby />
        </Authenticated>
        <Unauthenticated>
          <SignInForm signInUrl={signInUrl} signUpUrl={signUpUrl} />
        </Unauthenticated>
      </main>
    </>
  );
}

function SignInForm({ signInUrl, signUpUrl }: { signInUrl: string; signUpUrl: string }) {
  return (
    <div className="flex flex-col gap-4 w-96 mx-auto text-center">
      <p className="text-slate-600 dark:text-slate-400">Sign in to start playing</p>
      <div className="flex gap-4 justify-center">
        <a href={signInUrl}>
          <button className="bg-foreground text-background px-6 py-2 rounded-md hover:opacity-90">
            Sign in
          </button>
        </a>
        <a href={signUpUrl}>
          <button className="border border-foreground px-6 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            Sign up
          </button>
        </a>
      </div>
    </div>
  );
}

function GameLobby() {
  const navigate = useNavigate();
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.games.join);
  const openGames = useQuery(api.games.listOpen);
  const myGames = useQuery(api.games.myGames);

  const handleCreateGame = async () => {
    const gameId = await createGame();
    navigate({ to: '/game/$gameId', params: { gameId } });
  };

  const handleJoinGame = async (gameId: string) => {
    await joinGame({ gameId: gameId as any });
    navigate({ to: '/game/$gameId', params: { gameId } });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      {/* Create Game */}
      <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Start a New Game</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Create a game and wait for an opponent to join
        </p>
        <button
          className="bg-foreground text-background px-8 py-3 rounded-md text-lg hover:opacity-90"
          onClick={handleCreateGame}
        >
          Create New Game
        </button>
      </div>

      {/* My Active Games */}
      {myGames && myGames.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Your Active Games</h3>
          <div className="flex flex-col gap-2">
            {myGames.map((game) => (
              <button
                key={game._id}
                className="flex justify-between items-center p-4 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600"
                onClick={() => navigate({ to: '/game/$gameId', params: { gameId: game._id } })}
              >
                <span>Game {game._id.slice(-6)}</span>
                <span className="text-sm text-slate-500">
                  {game.phase} • {game.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Open Games to Join */}
      {openGames && openGames.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Join a Game</h3>
          <div className="flex flex-col gap-2">
            {openGames.map((game) => (
              <button
                key={game._id}
                className="flex justify-between items-center p-4 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600"
                onClick={() => handleJoinGame(game._id)}
              >
                <span>Game by {game.player1Data?.name || 'Unknown'}</span>
                <span className="text-sm bg-green-500 text-white px-2 py-1 rounded">
                  Join
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {openGames?.length === 0 && myGames?.length === 0 && (
        <p className="text-center text-slate-500">
          No open games available. Create one to start playing!
        </p>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const { signOut } = useAuth();

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-600 dark:text-slate-400">{user.email}</span>
      <button
        onClick={() => signOut()}
        className="text-sm text-red-500 hover:text-red-600"
      >
        Sign out
      </button>
    </div>
  );
}
