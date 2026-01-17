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

        {game.phase === 'generating' && draft && (
          <WorldGenerationCrawl
            game={game}
            draft={draft}
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

function WorldGenerationCrawl({ game, draft }: { game: any; draft: any }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showingWorld, setShowingWorld] = useState(false);

  const player1Picks = draft.player1Picks || [];
  const player2Picks = draft.player2Picks || [];

  // When world description appears, start typing it out
  useEffect(() => {
    if (game.worldDescription && !showingWorld) {
      setShowingWorld(true);
      let index = 0;
      const text = game.worldDescription;
      const interval = setInterval(() => {
        if (index <= text.length) {
          setDisplayedText(text.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 15); // Faster typing speed
      return () => clearInterval(interval);
    }
  }, [game.worldDescription, showingWorld]);

  return (
    <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 overflow-hidden relative">
      {/* Subtle starfield */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 1 + 's',
            }}
          />
        ))}
      </div>

      {/* Crawl Container */}
      <div className="relative flex items-center justify-center min-h-[300px]" style={{ perspective: '300px' }}>
        <div
          className="w-full max-w-2xl text-center"
          style={{
            transform: 'rotateX(20deg)',
            transformOrigin: '50% 100%',
          }}
        >
          {/* Scrolling content */}
          <div
            className="text-amber-400"
            style={{
              animation: showingWorld ? 'none' : 'crawl 18s linear',
            }}
          >
            {!showingWorld ? (
              <>
                <p className="text-purple-400 text-xs mb-4 tracking-widest uppercase">
                  Forging your world...
                </p>

                <h2 className="text-xl font-bold mb-6 text-amber-300">
                  A New Realm Emerges
                </h2>

                <div className="text-sm leading-relaxed space-y-3 px-4">
                  <p className="text-green-400">
                    <span className="font-medium">You</span>: {player1Picks.join(', ') || '...'}
                  </p>
                  <p className="text-blue-400">
                    <span className="font-medium">Opponent</span>: {player2Picks.join(', ') || '...'}
                  </p>
                </div>

                <div className="mt-6 flex justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4 text-amber-300">
                  {game.worldName || 'Your World'}
                </h2>

                <div className="text-sm leading-relaxed px-4 text-slate-200">
                  <p>{displayedText}</p>
                  {displayedText !== game.worldDescription && (
                    <span className="inline-block w-1.5 h-4 bg-amber-400 animate-pulse ml-0.5" />
                  )}
                </div>

                {game.resourceTypes && displayedText === game.worldDescription && (
                  <div className="mt-6 space-y-2 animate-fade-in">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Resources</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {game.resourceTypes.map((resource: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300"
                        >
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Subtle gradient fades */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />

      {/* CSS for crawl animation */}
      <style>{`
        @keyframes crawl {
          0% { transform: translateY(50%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-30%); opacity: 0.8; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
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
  const startWorldGeneration = useMutation(api.draft.startWorldGeneration);
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

          // If draft is complete after bot pick, start world generation
          if (result.draftComplete) {
            const player1Themes = draft.player1Picks;
            const player2Themes = [...draft.player2Picks, result.picked];

            // Start the crawl animation by transitioning to generating phase
            await startWorldGeneration({ gameId });

            // Generate the world (will update game.worldDescription when done)
            await generateWorld({
              gameId,
              player1Themes,
              player2Themes,
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

      // If draft is complete, start world generation with crawl animation
      if (result.draftComplete) {
        const player1Themes = draft.player1Picks.concat(myRole.role === 'player1' ? [word] : []);
        const player2Themes = draft.player2Picks.concat(myRole.role === 'player2' ? [word] : []);

        // Start the crawl animation by transitioning to generating phase
        await startWorldGeneration({ gameId });

        // Generate the world (will update game.worldDescription when done)
        await generateWorld({
          gameId,
          player1Themes,
          player2Themes,
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
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="font-bold mb-4 text-white">Your Hand</h3>
        {cards && cards.length > 0 ? (
          <div className="flex flex-wrap gap-4 justify-center">
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
  // MTG card dimensions: 2.5" x 3.5" (ratio ~0.714)
  // Using 250px width = 350px height
  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-xl"
      style={{
        width: '250px',
        height: '350px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Card Frame */}
      <div className="absolute inset-1 rounded-lg overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2d2d44 0%, #1f1f2e 100%)',
          border: '2px solid #4a4a6a',
        }}
      >
        {/* Header: Name and Mana Cost */}
        <div
          className="px-2 py-1.5"
          style={{
            background: 'linear-gradient(180deg, #3d3d5c 0%, #2d2d44 100%)',
            borderBottom: '1px solid #4a4a6a',
          }}
        >
          <div className="flex justify-between items-start gap-1">
            <h4 className="font-bold text-xs text-white leading-tight">
              {card.name}
            </h4>
          </div>
          <div className="mt-0.5">
            <span className="text-[8px] bg-amber-600/80 text-white px-1 py-0.5 rounded font-medium leading-none">
              {card.manaCost}
            </span>
          </div>
        </div>

        {/* Card Art */}
        <div
          className="mx-1.5 mt-1 relative overflow-hidden"
          style={{
            height: '140px',
            borderRadius: '4px',
            border: '2px solid #4a4a6a',
            background: '#1a1a2e',
          }}
        >
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-pulse text-slate-500 text-2xl mb-1">✨</div>
                <span className="text-slate-500 text-[10px]">Generating...</span>
              </div>
            </div>
          )}
        </div>

        {/* Type Line */}
        <div
          className="mx-1.5 mt-1 px-2 py-1"
          style={{
            background: 'linear-gradient(180deg, #3d3d5c 0%, #2d2d44 100%)',
            borderRadius: '3px',
            border: '1px solid #4a4a6a',
          }}
        >
          <p className="text-[10px] text-slate-300 font-medium">
            {card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)}
          </p>
        </div>

        {/* Text Box: Abilities and Flavor */}
        <div
          className="mx-1.5 mt-1 flex-1 overflow-hidden flex flex-col"
          style={{
            background: '#f4f1e6',
            borderRadius: '4px',
            border: '2px solid #4a4a6a',
          }}
        >
          <div className="p-2 flex-1 overflow-y-auto">
            {/* Abilities */}
            <div className="text-[10px] text-slate-800 space-y-1 leading-tight">
              {card.abilities.map((ability: any, i: number) => (
                <p key={i}>{ability.flavoredText}</p>
              ))}
            </div>

            {/* Flavor text */}
            {card.flavorText && (
              <p className="text-[9px] italic text-slate-600 mt-2 pt-2 border-t border-slate-300 leading-tight">
                "{card.flavorText}"
              </p>
            )}
          </div>

          {/* Power/Toughness for creatures */}
          {card.cardType === 'creature' && (
            <div className="absolute bottom-3 right-3">
              <div
                className="px-2 py-0.5 rounded font-bold text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #4a4a6a 0%, #2d2d44 100%)',
                  border: '2px solid #6a6a8a',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {card.power}/{card.toughness}
              </div>
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-1.5" />
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
