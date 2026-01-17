import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useEffect } from 'react';
import { Id } from '../../convex/_generated/dataModel';

export const Route = createFileRoute('/game/$gameId')({
  component: GamePage,
});

function GamePage() {
  const { gameId } = Route.useParams();
  const game = useQuery(api.games.get, { gameId: gameId as Id<"games"> });
  const draft = useQuery(api.draft.get, { gameId: gameId as Id<"games"> });
  const myRole = useQuery(api.draft.getMyRole, { gameId: gameId as Id<"games"> });

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading game...</p>
      </div>
    );
  }

  if (!myRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>You are not a player in this game</p>
      </div>
    );
  }

  const isTestGame = game.player2Data?.name === '🤖 Bot Player';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-background p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-slate-700">← Back</Link>
            <h1 className="text-xl font-bold">Game {gameId.slice(-6)}</h1>
            {isTestGame && (
              <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded">
                🧪 Test Mode
              </span>
            )}
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-sm px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded">
              {game.phase}
            </span>
            <span className="text-sm">
              You: {myRole.role === 'player1' ? game.player1Data?.name : game.player2Data?.name}
            </span>
          </div>
        </div>
      </header>

      {isTestGame && (
        <DevControls gameId={gameId as Id<"games">} game={game} />
      )}

      <main className="max-w-6xl mx-auto p-6">
        {game.phase === 'waiting' && (
          <WaitingForPlayer game={game} />
        )}

        {game.phase === 'draft' && draft && (
          <DraftPhase
            game={game}
            draft={draft}
            myRole={myRole}
            gameId={gameId as Id<"games">}
          />
        )}

        {game.phase === 'play' && (
          <PlayPhase
            game={game}
            myRole={myRole}
            gameId={gameId as Id<"games">}
          />
        )}
      </main>
    </div>
  );
}

function WaitingForPlayer({ game }: { game: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Waiting for Opponent</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Share this game ID with a friend:
        </p>
        <code className="block p-4 bg-slate-100 dark:bg-slate-700 rounded text-lg font-mono mb-4">
          {game._id}
        </code>
        <p className="text-sm text-slate-500">
          The game will start automatically when someone joins
        </p>
      </div>
    </div>
  );
}

function DraftPhase({
  game,
  draft,
  myRole,
  gameId,
}: {
  game: any;
  draft: any;
  myRole: { role: 'player1' | 'player2'; playerId: Id<"players"> };
  gameId: Id<"games">;
}) {
  const hasSubmittedWords = draft.words.length > 0;
  const isPickingPhase = draft.currentPicker !== undefined;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Vibe Draft</h2>
        <p className="text-slate-600 dark:text-slate-400">
          {!hasSubmittedWords
            ? "Submit words that will shape the world of this game"
            : isPickingPhase
            ? "Take turns picking words to build your deck's theme"
            : "Waiting for words to be submitted..."}
        </p>
      </div>

      {!isPickingPhase ? (
        <WordSubmission gameId={gameId} draft={draft} />
      ) : (
        <WordPicking
          gameId={gameId}
          draft={draft}
          myRole={myRole}
          game={game}
        />
      )}
    </div>
  );
}

function WordSubmission({ gameId, draft }: { gameId: Id<"games">; draft: any }) {
  const [words, setWords] = useState(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitWords = useMutation(api.draft.submitWords);
  const startPicking = useMutation(api.draft.startPicking);

  const handleSubmit = async () => {
    const validWords = words.filter(w => w.trim().length > 0);
    if (validWords.length === 0) return;

    setIsSubmitting(true);
    try {
      await submitWords({ gameId, words: validWords });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPicking = async () => {
    await startPicking({ gameId });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h3 className="font-bold mb-4">Submit Your Words</h3>
        <p className="text-sm text-slate-500 mb-4">
          Enter 1-3 words or short phrases that will influence the world and your cards.
          Examples: "volcanic fury", "deep ocean", "ancient machines"
        </p>

        <div className="space-y-3">
          {words.map((word, i) => (
            <input
              key={i}
              type="text"
              value={word}
              onChange={(e) => {
                const newWords = [...words];
                newWords[i] = e.target.value;
                setWords(newWords);
              }}
              placeholder={`Word ${i + 1}`}
              className="w-full p-3 border rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              maxLength={50}
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || words.every(w => !w.trim())}
          className="mt-4 w-full bg-foreground text-background py-3 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Words'}
        </button>
      </div>

      {draft.words.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h3 className="font-bold mb-4">Word Pool ({draft.words.length} words)</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {draft.words.map((word: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm"
              >
                {word}
              </span>
            ))}
          </div>

          {draft.words.length >= 4 && (
            <button
              onClick={handleStartPicking}
              className="w-full bg-green-500 text-white py-3 rounded-md hover:bg-green-600"
            >
              Start Picking Phase
            </button>
          )}
          {draft.words.length < 4 && (
            <p className="text-sm text-slate-500 text-center">
              Need at least 4 words to start picking
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function WordPicking({
  gameId,
  draft,
  myRole,
  game,
}: {
  gameId: Id<"games">;
  draft: any;
  myRole: { role: 'player1' | 'player2'; playerId: Id<"players"> };
  game: any;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pickWord = useMutation(api.draft.pickWord);
  const botAutoPick = useMutation(api.dev.botAutoPick);
  const generateWorld = useAction(api.ai.generateWorld);

  const isTestGame = game.player2Data?.name === '🤖 Bot Player';
  const isMyTurn = draft.currentPicker === myRole.playerId;
  const isBotTurn = isTestGame && draft.currentPicker && draft.currentPicker !== myRole.playerId;
  const myPicks = myRole.role === 'player1' ? draft.player1Picks : draft.player2Picks;
  const opponentPicks = myRole.role === 'player1' ? draft.player2Picks : draft.player1Picks;

  // Auto-trigger bot pick when it's bot's turn
  useEffect(() => {
    if (isBotTurn && !isSubmitting) {
      const timer = setTimeout(async () => {
        setIsSubmitting(true);
        try {
          const result = await botAutoPick({ gameId });

          // If draft is complete after bot pick, generate world
          if (result.draftComplete) {
            await generateWorld({
              gameId,
              player1Themes: draft.player1Picks,
              player2Themes: [...draft.player2Picks, result.picked],
            });
          }
        } finally {
          setIsSubmitting(false);
        }
      }, 1000); // 1 second delay for UX
      return () => clearTimeout(timer);
    }
  }, [isBotTurn, draft.currentPicker]);

  const handlePick = async (word: string) => {
    if (!isMyTurn || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await pickWord({ gameId, word });

      // If draft is complete, generate the world
      if (result.draftComplete) {
        await generateWorld({
          gameId,
          player1Themes: draft.player1Picks.concat(myRole.role === 'player1' ? [word] : []),
          player2Themes: draft.player2Picks.concat(myRole.role === 'player2' ? [word] : []),
        });
      }
      // Bot will auto-pick via useEffect when it becomes their turn
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Turn indicator */}
      <div className={`text-center p-4 rounded-lg ${isMyTurn ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-100 dark:bg-slate-800'}`}>
        <p className="text-lg font-bold">
          {isMyTurn ? "Your turn to pick!" : isBotTurn ? "🤖 Bot is picking..." : "Waiting for opponent..."}
        </p>
      </div>

      {/* Word pool */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h3 className="font-bold mb-4">Available Words</h3>
        <div className="flex flex-wrap gap-3">
          {draft.words.map((word: string, i: number) => (
            <button
              key={i}
              onClick={() => handlePick(word)}
              disabled={!isMyTurn || isSubmitting}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                isMyTurn
                  ? 'border-green-500 hover:bg-green-50 dark:hover:bg-green-900 cursor-pointer'
                  : 'border-slate-300 dark:border-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Picks display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h4 className="font-bold mb-2 text-green-600">Your Picks</h4>
          <div className="flex flex-wrap gap-2">
            {myPicks.map((word: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900 rounded-full text-sm">
                {word}
              </span>
            ))}
            {myPicks.length === 0 && (
              <span className="text-slate-400 text-sm">No picks yet</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h4 className="font-bold mb-2 text-blue-600">Opponent's Picks</h4>
          <div className="flex flex-wrap gap-2">
            {opponentPicks.map((word: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">
                {word}
              </span>
            ))}
            {opponentPicks.length === 0 && (
              <span className="text-slate-400 text-sm">No picks yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayPhase({
  game,
  myRole,
  gameId,
}: {
  game: any;
  myRole: { role: 'player1' | 'player2'; playerId: Id<"players"> };
  gameId: Id<"games">;
}) {
  const generateCard = useAction(api.ai.generateCard);
  const [isGenerating, setIsGenerating] = useState(false);
  const cards = useQuery(api.cards.getMyHand, { gameId });

  const myThemes = myRole.role === 'player1'
    ? game.player1Picks || []
    : game.player2Picks || [];

  const handleDrawCard = async () => {
    if (!game.worldDescription || !game.resourceTypes) return;

    setIsGenerating(true);
    try {
      await generateCard({
        gameId,
        playerId: myRole.playerId,
        worldDescription: game.worldDescription,
        playerThemes: myThemes,
        resourceTypes: game.resourceTypes,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* World Description */}
      {game.worldDescription && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 p-6 rounded-lg">
          <h3 className="font-bold mb-2">The World</h3>
          <p className="text-sm">{game.worldDescription}</p>
          {game.resourceTypes && (
            <div className="mt-4 flex gap-2">
              {game.resourceTypes.map((r: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-white/50 dark:bg-black/30 rounded-full text-sm">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Game State */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
          <h4 className="font-bold">You</h4>
          <p className="text-3xl font-bold text-green-600">
            {myRole.role === 'player1' ? game.player1Life : game.player2Life} HP
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
          <h4 className="font-bold">Opponent</h4>
          <p className="text-3xl font-bold text-red-600">
            {myRole.role === 'player1' ? game.player2Life : game.player1Life} HP
          </p>
        </div>
      </div>

      {/* Draw Card */}
      <div className="text-center">
        <button
          onClick={handleDrawCard}
          disabled={isGenerating}
          className="bg-foreground text-background px-8 py-4 rounded-lg text-lg hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating ? 'Generating Card...' : 'Draw a Card'}
        </button>
      </div>

      {/* Hand */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg">
        <h3 className="font-bold mb-4">Your Hand</h3>
        {cards && cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <CardDisplay key={card._id} card={card} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">
            Your hand is empty. Draw a card!
          </p>
        )}
      </div>
    </div>
  );
}

function CardDisplay({ card }: { card: any }) {
  return (
    <div className="border-2 border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
      {/* Card Image */}
      <div className="h-40 bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-500">Generating image...</span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-sm">{card.name}</h4>
          <span className="text-xs bg-slate-300 dark:bg-slate-600 px-2 py-0.5 rounded">
            {card.manaCost}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
          {card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)}
        </p>

        {/* Abilities */}
        <div className="text-xs space-y-1 mb-2">
          {card.abilities.map((ability: any, i: number) => (
            <p key={i}>{ability.flavoredText}</p>
          ))}
        </div>

        {/* Flavor text */}
        <p className="text-xs italic text-slate-500 dark:text-slate-400">
          "{card.flavorText}"
        </p>

        {/* Stats for creatures */}
        {card.cardType === 'creature' && (
          <div className="mt-2 text-right">
            <span className="font-bold">{card.power}/{card.toughness}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DevControls({ gameId, game }: { gameId: Id<"games">; game: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const skipToPlay = useMutation(api.dev.skipToPlayPhase);

  const handleSkipToPlay = async () => {
    await skipToPlay({ gameId });
  };

  return (
    <div className="bg-purple-50 dark:bg-purple-950 border-b border-purple-200 dark:border-purple-800">
      <div className="max-w-6xl mx-auto px-6 py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
        >
          🧪 Dev Controls {isOpen ? '▼' : '▶'}
        </button>

        {isOpen && (
          <div className="mt-3 pb-2 flex flex-wrap gap-3">
            {game.phase === 'draft' && (
              <button
                onClick={handleSkipToPlay}
                className="text-xs px-3 py-1.5 bg-purple-200 dark:bg-purple-800 rounded hover:bg-purple-300 dark:hover:bg-purple-700"
              >
                ⏭️ Skip to Play Phase
              </button>
            )}

            <div className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-4">
              <span>Phase: <strong>{game.phase}</strong></span>
              <span>Turn: <strong>{game.turnPhase || 'N/A'}</strong></span>
              <span>P1 Life: <strong>{game.player1Life}</strong></span>
              <span>P2 Life: <strong>{game.player2Life}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
