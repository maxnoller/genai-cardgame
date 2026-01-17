import { createFileRoute } from '@tanstack/react-router';
import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos/authkit-tanstack-react-start/client';
import { getAuth, getSignInUrl, getSignUpUrl } from '@workos/authkit-tanstack-react-start';
import type { User } from '@workos/authkit-tanstack-react-start';

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
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto text-center">
      <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Ready to draft your deck and battle with AI-generated cards?
        </p>
        <button
          className="bg-foreground text-background px-8 py-3 rounded-md text-lg hover:opacity-90"
          onClick={() => {
            // TODO: Implement game creation
            console.log('Create game');
          }}
        >
          Create New Game
        </button>
      </div>

      <div className="text-sm text-slate-500">
        <p>Or join an existing game with a code</p>
      </div>
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
