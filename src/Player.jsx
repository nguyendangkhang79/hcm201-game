import { bingoWords } from './data/bingo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { db } from './firebase';
import Chat from './Chat';
const bgImage = '/history/palace.jpg';
import './Player.css';
import './GameHeader.css';
import './PlayerAutoArrange.css';
import './PlayerUX.css';

const EMPTY_BOARD = () => Array(25).fill(null);
const EMPTY_MARKS = () => Array(25).fill(false);

function getUniqueWords(words) {
  return [
    ...new Set(
      words.filter(
        (word) => typeof word === 'string' && word.trim().length > 0,
      ),
    ),
  ];
}

function shuffleWords(words, random = Math.random) {
  const shuffled = [...words];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target],
      shuffled[index],
    ];
  }

  return shuffled;
}

function createAutoBoard(
  currentBoard,
  words,
  { status, ready },
  random = Math.random,
) {
  const fail = (message) => ({
    board: currentBoard,
    error: message,
  });

  if (status !== 'waiting' || ready) {
    return fail(
      'Bảng đã khóa. Chỉ được tự xếp trước khi xác nhận sẵn sàng.',
    );
  }

  if (!Array.isArray(currentBoard) || currentBoard.length !== 25) {
    return fail('Bảng chưa hợp lệ. Vui lòng tải lại trang.');
  }

  const validWords = getUniqueWords(words);
  const placedWords = currentBoard.filter(Boolean);

  if (new Set(placedWords).size !== placedWords.length) {
    return fail(
      'Bảng đang có từ khóa trùng. Hãy gỡ các ô trùng trước khi tự xếp.',
    );
  }

  if (placedWords.some((word) => !validWords.includes(word))) {
    return fail(
      'Bộ từ khóa đã thay đổi. Hãy gỡ từ không còn trong bộ từ khóa rồi thử lại.',
    );
  }

  if (placedWords.length === 25) {
    return {
      board: shuffleWords(currentBoard, random),
      mode: 'shuffle',
    };
  }

  const used = new Set(placedWords);
  const candidates = validWords.filter((word) => !used.has(word));
  const emptyCount = 25 - placedWords.length;

  if (candidates.length < emptyCount) {
    return fail(
      `Cần ${emptyCount} từ để điền ô trống, nhưng chỉ còn ${candidates.length} từ khác nhau. Hãy nhờ Trọng tài bổ sung từ khóa.`,
    );
  }

  const selected = shuffleWords(candidates, random).slice(
    0,
    emptyCount,
  );

  let cursor = 0;
  const nextBoard = currentBoard.map(
    (word) => word || selected[cursor++],
  );

  return {
    board: nextBoard,
    mode: 'fill',
    filled: emptyCount,
  };
}

const WINNING_LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

const STATUS_LABELS = {
  waiting: 'Đang chuẩn bị',
  playing: 'Đang diễn ra',
  ended: 'Đã kết thúc',
};

function Icon({ name }) {
  if (name === 'shuffle') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h3c4 0 8 12 12 12h3M17 14l4 4-4 4M3 18h3c2 0 4-3 6-6s4-6 6-6h3M17 2l4 4-4 4" />
      </svg>
    );
  }

  if (name === 'back') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === 'user') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M5 17v3h14v-3" />
    </svg>
  );
}

export default function Player() {
  const location = useLocation();
  const navigate = useNavigate();
  const playerName = location.state?.playerName || '';

  const [gameStatus, setGameStatus] = useState('waiting');
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [allWords, setAllWords] = useState([]);
  const [unlockedWords, setUnlockedWords] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [markedCells, setMarkedCells] = useState(EMPTY_MARKS);
  const [gameBlocked, setGameBlocked] = useState(false);
  const [victory, setVictory] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [placementMode, setPlacementMode] = useState('drag');
  const [draggingWord, setDraggingWord] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [wordBankOpen, setWordBankOpen] = useState(false);
  const [wordsLoaded, setWordsLoaded] = useState(false);
  const [gameStatusLoaded, setGameStatusLoaded] = useState(false);
  const [setupNotice, setSetupNotice] = useState(null);

  const gameStatusRef = useRef(null);
  const initialStatusChecked = useRef(false);
  const winAnnounced = useRef(false);
  const isReadyRef = useRef(false);
  const playerSessionId = useRef(crypto.randomUUID());
  const dragItem = useRef(null);

  const availableWords = useMemo(
    () => allWords.filter((word) => !board.includes(word)),
    [allWords, board],
  );

  const effectiveSelectedWord = availableWords.includes(selectedWord)
    ? selectedWord
    : null;

  const filledCount = board.filter(Boolean).length;

  const isLocked =
    !gameStatusLoaded || isReady || gameStatus !== 'waiting';

  const validBoard =
    filledCount === 25 &&
    new Set(board).size === 25 &&
    board.every((word) => allWords.includes(word));

  const canReady =
    gameStatusLoaded &&
    wordsLoaded &&
    validBoard &&
    (gameStatus === 'waiting' || gameStatus === 'playing');

  const needsLateConfirmation =
    gameStatus === 'playing' && !isReady;

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    if (setupNotice?.type !== 'success') return undefined;

    const timeout = window.setTimeout(() => {
      setSetupNotice(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [setupNotice]);

  useEffect(() => {
    if (!playerName) navigate('/', { replace: true });
  }, [playerName, navigate]);

  useEffect(() => {
    const unsubscribeStatus = onValue(
      ref(db, 'courses/vnr202/gameState/status'),
      (snapshot) => {
        const status = snapshot.val() || 'waiting';
        gameStatusRef.current = status;
        setGameStatus(status);
        setGameStatusLoaded(true);

        if (!initialStatusChecked.current) {
          initialStatusChecked.current = true;
          if (status === 'playing') setGameBlocked(true);
        }
      },
    );

    const unsubscribeWords = onValue(
      ref(db, 'courses/vnr202/gameState/wordList'),
      (snapshot) => {
        setAllWords(
          getUniqueWords(Object.values(snapshot.val() || bingoWords)),
        );
        setWordsLoaded(true);
      },
    );

    const unsubscribeActiveWords = onValue(
      ref(db, 'courses/vnr202/gameState/activeWords'),
      (snapshot) => {
        if (snapshot.exists()) {
          setUnlockedWords(Object.values(snapshot.val()));
        } else {
          setUnlockedWords([]);
          setMarkedCells(EMPTY_MARKS());
          isReadyRef.current = false;
          setIsReady(false);
          setVictory(null);
          winAnnounced.current = false;
        }
      },
    );

    return () => {
      unsubscribeStatus();
      unsubscribeWords();
      unsubscribeActiveWords();
    };
  }, []);

  useEffect(() => {
    if (!playerName || gameBlocked) return undefined;

    const presenceRef = ref(
      db,
      `courses/vnr202/gameState/players/${playerSessionId.current}`,
    );

    const unsubscribeConnection = onValue(
      ref(db, '.info/connected'),
      (snapshot) => {
        if (snapshot.val() !== true) return;

        onDisconnect(presenceRef).remove();

        set(presenceRef, {
          name: playerName,
          joinedAt: serverTimestamp(),
          ready: isReadyRef.current,
        });
      },
    );

    return () => {
      unsubscribeConnection();
      remove(presenceRef);
    };
  }, [playerName, gameBlocked]);

  useEffect(() => {
    if (!playerName || gameBlocked) return;

    update(
      ref(db, `courses/vnr202/gameState/players/${playerSessionId.current}`),
      { ready: isReady },
    );
  }, [playerName, gameBlocked, isReady]);

  const startDrag = (event, word, sourceIndex = null) => {
    if (placementMode !== 'drag' || isLocked) {
      event.preventDefault();
      return;
    }

    setSetupNotice(null);
    dragItem.current = { word, sourceIndex };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', word);
    setDraggingWord(word);
  };

  const finishDrag = () => {
    dragItem.current = null;
    setDraggingWord(null);
    setDragOverCell(null);
  };

  const handleAutoArrange = () => {
    if (!wordsLoaded || gameBlocked) return;

    const result = createAutoBoard(board, allWords, {
      status: gameStatusRef.current,
      ready: isReadyRef.current,
    });

    if (result.error) {
      setSetupNotice({ type: 'error', message: result.error });
      return;
    }

    finishDrag();
    setSelectedWord(null);
    setBoard(result.board);
    setMarkedCells(EMPTY_MARKS());

    setSetupNotice({
      type: 'success',
      message:
        result.mode === 'shuffle'
          ? 'Đã trộn vị trí. Giữ nguyên 25 từ khóa.'
          : `Đã điền ${result.filled} ô trống. Giữ nguyên các ô bạn đã xếp.`,
    });
  };

  const handleReady = () => {
    const status = gameStatusRef.current;

    if (
      !canReady ||
      gameBlocked ||
      isReadyRef.current ||
      (status !== 'waiting' && status !== 'playing')
    ) {
      return;
    }

    finishDrag();
    setSelectedWord(null);
    setSetupNotice(null);
    isReadyRef.current = true;
    setIsReady(true);
  };

  const dropOnCell = (event, destinationIndex) => {
    event.preventDefault();
    const item = dragItem.current;

    if (!item || placementMode !== 'drag' || isLocked) return;

    setBoard((currentBoard) => {
      const nextBoard = [...currentBoard];

      if (item.sourceIndex !== null) {
        nextBoard[item.sourceIndex] = null;
      }

      nextBoard[destinationIndex] = item.word;
      return nextBoard;
    });

    finishDrag();
  };

  const dropOnWordBank = (event) => {
    event.preventDefault();
    const item = dragItem.current;

    if (!item || item.sourceIndex === null || isLocked) return;

    setBoard((currentBoard) => {
      const nextBoard = [...currentBoard];
      nextBoard[item.sourceIndex] = null;
      return nextBoard;
    });

    finishDrag();
  };

  const registerVictory = async () => {
    setVictory({ rank: null, status: 'saving' });

    try {
      const counter = await runTransaction(
        ref(db, 'courses/vnr202/gameState/winnerCount'),
        (current) => (current || 0) + 1,
      );

      const rank = counter.snapshot.val();

      await set(
        ref(db, `courses/vnr202/gameState/winners/${playerSessionId.current}`),
        {
          name: playerName,
          rank,
          timestamp: serverTimestamp(),
        },
      );

      setVictory({ rank, status: 'saved' });
    } catch (error) {
      console.error('Không thể lưu kết quả Bingo:', error);
      setVictory({ rank: null, status: 'error' });
    }
  };

  const handleCellClick = (index, word) => {
    if (
      placementMode === 'tap' &&
      !isLocked &&
      effectiveSelectedWord
    ) {
      setSetupNotice(null);

      setBoard((currentBoard) => {
        const nextBoard = [...currentBoard];
        nextBoard[index] = effectiveSelectedWord;
        return nextBoard;
      });

      setSelectedWord(null);
      return;
    }

    if (
      !isReady ||
      gameStatus !== 'playing' ||
      !word ||
      !unlockedWords.includes(word)
    ) {
      return;
    }

    const nextMarks = [...markedCells];
    nextMarks[index] = !nextMarks[index];
    setMarkedCells(nextMarks);

    const hasWon = WINNING_LINES.some(
      (line) => line.every((cell) => nextMarks[cell]),
    );

    if (hasWon && !winAnnounced.current) {
      winAnnounced.current = true;
      registerVictory();
    }
  };

  const removeCellWord = (event, index) => {
    event.stopPropagation();
    if (isLocked) return;

    setSetupNotice(null);

    setBoard((currentBoard) => {
      const nextBoard = [...currentBoard];
      nextBoard[index] = null;
      return nextBoard;
    });
  };

  const changePlacementMode = (mode) => {
    if (isLocked) return;

    finishDrag();
    setSetupNotice(null);
    setPlacementMode(mode);
    setSelectedWord(null);

    if (mode === 'tap') setWordBankOpen(true);
  };

  const leaveGame = () => {
    if (
      filledCount > 0 &&
      !window.confirm(
        'Rời phòng? Bảng Bingo hiện tại của bạn sẽ không được lưu.',
      )
    ) {
      return;
    }

    navigate('/', { replace: true });
  };

  if (!playerName) return null;

  if (gameBlocked) {
    return (
      <div
        className="player-page player-blocked"
        style={{ '--player-bg': `url(${bgImage})` }}
      >
        <main className="blocked-card" role="alert">
          <span className="blocked-icon">!</span>
          <p className="eyebrow">PHÒNG ĐANG KHÓA</p>
          <h1>Ván chơi đã bắt đầu</h1>
          <p>
            Bạn không thể tham gia khi trận đấu đang diễn ra.
            Hãy chờ Trọng tài mở ván mới.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/', { replace: true })}
          >
            Về trang chủ
          </button>
        </main>
      </div>
    );
  }

  if (victory) {
    return (
      <div
        className="player-page result-page"
        style={{ '--player-bg': `url(${bgImage})` }}
      >
        <div className="result-confetti" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <i key={index} style={{ '--i': index }} />
          ))}
        </div>

        <main className="result-card" aria-live="polite">
          <header className="result-header">
            <div className="result-brand">
              <img src="/brand-mark.svg" alt="" />
              <span>
                <strong>BINGO</strong>
                <small>HỘI NHẬP</small>
              </span>
            </div>

            <span className={`save-badge save-${victory.status}`}>
              <i />
              {victory.status === 'saved'
                ? 'Đã lưu kết quả'
                : victory.status === 'error'
                  ? 'Lỗi kết nối'
                  : 'Đang xác nhận'}
            </span>
          </header>

          <div className="result-content">
            <section className="result-message">
              <div className="result-trophy" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M20 10h24v10c0 11-5 18-12 18s-12-7-12-18V10Z" />
                  <path d="M20 15H10v5c0 8 5 13 14 13M44 15h10v5c0 8-5 13-14 13M32 38v10M23 54h18M26 48h12" />
                </svg>
              </div>

              <p className="result-kicker">
                CHÚC MỪNG CHIẾN THẮNG
              </p>
              <h1>{playerName}</h1>
              <p>
                Bạn đã hoàn thành một hàng Bingo gồm 5 ô liên
                tiếp. Một kết quả xứng đáng cho sự tập trung và
                kết nối xuất sắc.
              </p>
            </section>

            <section
              className="result-rank"
              aria-label="Thứ hạng của bạn"
            >
              <span>KẾT QUẢ CHÍNH THỨC</span>

              {victory.status === 'saving' && (
                <strong className="result-pending">···</strong>
              )}

              {victory.status === 'saved' && (
                <strong>
                  <small>HẠNG</small>
                  {String(victory.rank).padStart(2, '0')}
                </strong>
              )}

              {victory.status === 'error' && (
                <strong className="result-error">—</strong>
              )}

              <p>
                {victory.status === 'saved'
                  ? `Bạn là người thứ ${victory.rank} hoàn thành Bingo trong ván này.`
                  : victory.status === 'error'
                    ? 'Chưa thể ghi nhận thứ hạng. Hãy báo Trọng tài kiểm tra kết nối.'
                    : 'Hệ thống đang ghi nhận thứ hạng của bạn.'}
              </p>
            </section>
          </div>

          <footer className="result-footer">
            <p>
              <span>★</span>
              HỘI NHẬP SÂU RỘNG · TỰ CHỦ VỮNG VÀNG
            </p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
            >
              Về trang chủ
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </footer>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`player-page player-stage-${gameStatus} ${
        isReady ? 'player-is-ready' : ''
      }`}
      style={{ '--player-bg': `url(${bgImage})` }}
    >
      <div className="player-shell">
        <header className="player-header">
          <div className="brand-group">
            <button
              type="button"
              className="icon-button"
              onClick={leaveGame}
              aria-label="Rời phòng"
            >
              <Icon name="back" />
            </button>

            <div className="brand-mark">
              <img src="/brand-mark.svg" alt="" />
            </div>

            <span className="player-brand-text">
              <strong>BINGO VNR202</strong>
              <small>HỌC TẬP QUA TRÒ CHƠI</small>
            </span>
          </div>

          <div className="header-meta">
            <span className={`status-badge status-${gameStatus}`}>
              <i />
              {STATUS_LABELS[gameStatus] || STATUS_LABELS.waiting}
            </span>

            <div className="player-identity">
              <Icon name="user" />
              <span>
                <small>Người chơi</small>
                <strong title={playerName}>{playerName}</strong>
              </span>
            </div>
          </div>
        </header>

        <section
          className="play-guide"
          aria-label="Hướng dẫn theo trạng thái ván"
        >
          <div className="play-guide-copy">
            <span className="play-guide-icon" aria-hidden="true">
              {gameStatus === 'playing'
                ? '▶'
                : gameStatus === 'ended'
                  ? '■'
                  : '✦'}
            </span>

            <div>
              <strong>
                {gameStatus === 'playing'
                  ? 'Ván chơi đang diễn ra'
                  : gameStatus === 'ended'
                    ? 'Ván chơi đã kết thúc'
                    : isReady
                      ? 'Thẻ đã sẵn sàng'
                      : 'Chuẩn bị thẻ của bạn'}
              </strong>

              <p>
                {gameStatus === 'playing'
                  ? 'Chạm vào từ đã được Trọng tài công bố. Đủ 5 ô ngang, dọc hoặc chéo để hoàn thành Bingo.'
                  : gameStatus === 'ended'
                    ? 'Chờ Trọng tài mở ván mới để tiếp tục.'
                    : isReady
                      ? 'Bảng đã khóa. Chờ Trọng tài bắt đầu ván chơi.'
                      : 'Xếp đủ 25 từ khóa bằng tay hoặc dùng “Tự xếp thẻ”, rồi xác nhận sẵn sàng.'}
              </p>
            </div>
          </div>

          <ol className="play-steps" aria-label="Các bước tham gia">
            <li
              className={
                filledCount === 25 ? 'step-done' : 'step-current'
              }
            >
              <span>{filledCount === 25 ? '✓' : '1'}</span>
              Xếp thẻ
            </li>

            <li
              className={
                isReady
                  ? 'step-done'
                  : filledCount === 25
                    ? 'step-current'
                    : ''
              }
            >
              <span>{isReady ? '✓' : '2'}</span>
              Sẵn sàng
            </li>

            <li
              className={
                gameStatus === 'playing' && isReady
                  ? 'step-current'
                  : ''
              }
            >
              <span>3</span>
              Chơi Bingo
            </li>
          </ol>
        </section>

        <main className="game-layout">
          <section className="board-panel" aria-label="Bảng Bingo">
            <div className="section-heading board-heading">
              <div>
                <p className="eyebrow">THẺ CỦA BẠN</p>
                <h2>Bảng Bingo</h2>
              </div>

              <div className="board-heading-actions">
                {!isLocked && (
                  <button
                    type="button"
                    className="auto-arrange-button"
                    onClick={handleAutoArrange}
                    disabled={!wordsLoaded || Boolean(draggingWord)}
                    title={
                      filledCount === 25
                        ? 'Trộn vị trí, giữ nguyên 25 từ khóa trên bảng'
                        : 'Tự điền ô trống, giữ nguyên các ô đã xếp'
                    }
                  >
                    <Icon name="shuffle" />
                    {!wordsLoaded
                      ? 'Đang tải…'
                      : filledCount === 25
                        ? 'Trộn vị trí'
                        : 'Tự xếp thẻ'}
                  </button>
                )}

                <span className="board-progress">
                  {filledCount}
                  <small>/25 ô</small>
                </span>
              </div>
            </div>

            {!isLocked && (
              <div className="interaction-toolbar">
                <div>
                  <strong>Cách xếp thẻ</strong>
                  <span>
                    {placementMode === 'drag'
                      ? 'Giữ và kéo từ khóa vào ô'
                      : 'Chọn từ khóa, sau đó chạm vào ô'}
                  </span>
                </div>

                <div
                  className="interaction-switch"
                  role="group"
                  aria-label="Chọn cách xếp từ khóa"
                >
                  <button
                    type="button"
                    className={
                      placementMode === 'drag' ? 'is-active' : ''
                    }
                    onClick={() => changePlacementMode('drag')}
                    aria-pressed={placementMode === 'drag'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 11V6a2 2 0 0 1 4 0v4-2a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5a7 7 0 0 1-7 7h-1a7 7 0 0 1-6.1-3.6L4.3 14a2 2 0 0 1 3.4-2l1.3 2.1V11Z" />
                    </svg>
                    Kéo thả
                  </button>

                  <button
                    type="button"
                    className={
                      placementMode === 'tap' ? 'is-active' : ''
                    }
                    onClick={() => changePlacementMode('tap')}
                    aria-pressed={placementMode === 'tap'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2v3M5.6 4.6l2.1 2.1M3 11h3M18.4 4.6l-2.1 2.1" />
                      <path d="M10 13V9a2 2 0 0 1 4 0v3.5l1.2-.7a2 2 0 0 1 2.7.7l1.1 1.8a5 5 0 0 1-4.3 7.7H14a6 6 0 0 1-6-6v-1a2 2 0 0 1 2-2Z" />
                    </svg>
                    Chọn &amp; chạm
                  </button>
                </div>
              </div>
            )}

            {!isLocked && (
              <p
                className={`auto-arrange-notice ${
                  setupNotice ? `notice-${setupNotice.type}` : ''
                }`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {setupNotice?.message || ''}
              </p>
            )}

            {effectiveSelectedWord && (
              <div className="selection-hint">
                Đã chọn “{effectiveSelectedWord}” — chạm vào một ô
                để đặt từ khóa.
              </div>
            )}

            {gameStatus === 'playing' && (
              <div className="board-legend" aria-label="Ý nghĩa màu ô">
                <span>
                  <i className="legend-waiting" aria-hidden="true" />
                  Chưa công bố
                </span>
                <span>
                  <i className="legend-unlocked" aria-hidden="true" />
                  Có thể đánh dấu
                </span>
                <span>
                  <i className="legend-marked" aria-hidden="true" />
                  Đã đánh dấu
                </span>
              </div>
            )}

            <div className="bingo-board">
              {board.map((word, index) => {
                const isUnlocked =
                  Boolean(word) && unlockedWords.includes(word);
                const isMarked = markedCells[index];

                let stateClass = word ? 'is-filled' : 'is-empty';

                if (gameStatus === 'playing' && isUnlocked) {
                  stateClass += ' is-unlocked';
                }

                if (isMarked) stateClass += ' is-marked';

                return (
                  <div
                    key={`cell-${index}`}
                    className={`bingo-cell ${stateClass} ${
                      dragOverCell === index ? 'is-drag-over' : ''
                    }`}
                    onClick={() => handleCellClick(index, word)}
                    onDragOver={(event) => {
                      if (placementMode === 'drag' && !isLocked) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDragOverCell(index);
                      }
                    }}
                    onDragLeave={() =>
                      setDragOverCell((current) =>
                        current === index ? null : current,
                      )
                    }
                    onDrop={(event) => dropOnCell(event, index)}
                    role={
                      isUnlocked && isReady ? 'button' : undefined
                    }
                    tabIndex={
                      isUnlocked && isReady ? 0 : undefined
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' ||
                        event.key === ' '
                      ) {
                        handleCellClick(index, word);
                      }
                    }}
                  >
                    {word ? (
                      <div
                        className={`cell-content ${
                          draggingWord === word ? 'is-dragging' : ''
                        }`}
                        draggable={
                          !isLocked && placementMode === 'drag'
                        }
                        onDragStart={(event) =>
                          startDrag(event, word, index)
                        }
                        onDragEnd={finishDrag}
                      >
                        <span>{word}</span>

                        {!isLocked && (
                          <button
                            type="button"
                            className="remove-word"
                            onClick={(event) =>
                              removeCellWord(event, index)
                            }
                            aria-label={`Gỡ ${word}`}
                          >
                            ×
                          </button>
                        )}

                        {isMarked && (
                          <span
                            className="check-mark"
                            aria-label="Đã đánh dấu"
                          >
                            <Icon name="check" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="cell-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className={`action-bar ${
                filledCount === 25 && !isReady ? 'needs-ready' : ''
              }`}
            >
              <div className="action-message">
                {isReady ? (
                  <>
                    <strong>
                      <Icon name="check" />
                      {gameStatus === 'playing'
                        ? 'Đang chơi Bingo'
                        : 'Đã sẵn sàng'}
                    </strong>

                    <span>
                      {gameStatus === 'playing'
                        ? 'Chạm vào ô đã công bố để đánh dấu hoặc bỏ đánh dấu.'
                        : gameStatus === 'ended'
                          ? 'Ván đã kết thúc. Chờ Trọng tài mở ván mới.'
                          : 'Bảng đã khóa. Chờ Trọng tài bắt đầu ván chơi.'}
                    </span>
                  </>
                ) : (
                  <>
                    <strong>
                      {filledCount === 25
                        ? 'Bảng đã hoàn tất'
                        : `Còn ${25 - filledCount} ô trống`}
                    </strong>

                    <span>
                      {filledCount === 25
                        ? 'Bấm “Xác nhận sẵn sàng” để có thể chơi khi ván bắt đầu.'
                        : 'Tự xếp thẻ, kéo thả hoặc chọn từ khóa để lấp đầy bảng'}
                    </span>
                  </>
                )}
              </div>

              {!isReady && (
                <button
                  type="button"
                  className="primary-button"
                  disabled={!canReady}
                  onClick={handleReady}
                >
                  {gameStatus === 'playing'
                    ? 'Xác nhận và tham gia ngay'
                    : 'Xác nhận sẵn sàng'}
                </button>
              )}
            </div>
          </section>

          <aside
            className={`word-panel ${wordBankOpen ? 'is-open' : ''}`}
          >
            <button
              type="button"
              className="word-panel-toggle"
              onClick={() => setWordBankOpen((open) => !open)}
              aria-expanded={wordBankOpen}
            >
              <span>
                <strong>Kho từ khóa</strong>
                <small>{availableWords.length} từ còn lại</small>
              </span>
              <Icon name="down" />
            </button>

            <div className="word-panel-body">
              <div className="section-heading word-heading">
                <div>
                  <p className="eyebrow">CHUẨN BỊ THẺ</p>
                  <h2>Kho từ khóa</h2>
                </div>
                <span className="word-count">
                  {availableWords.length}
                </span>
              </div>

              <p className="word-instruction">
                {isLocked
                  ? 'Bảng đã khóa. Kho từ khóa bên dưới chỉ dùng để tham khảo.'
                  : placementMode === 'drag'
                    ? 'Kéo từ khóa vào bảng. Kéo trở lại kho để gỡ khỏi ô.'
                    : 'Chọn một từ khóa bên dưới, sau đó chạm vào ô muốn đặt.'}
              </p>

              <div
                className="word-list"
                onDragOver={(event) => {
                  if (
                    dragItem.current &&
                    dragItem.current.sourceIndex !== null &&
                    !isLocked
                  ) {
                    event.preventDefault();
                  }
                }}
                onDrop={dropOnWordBank}
              >
                {availableWords.map((word) => (
                  <button
                    type="button"
                    key={word}
                    draggable={
                      !isLocked && placementMode === 'drag'
                    }
                    onDragStart={(event) => startDrag(event, word)}
                    onDragEnd={finishDrag}
                    className={`word-chip mode-${placementMode} ${
                      selectedWord === word ? 'is-selected' : ''
                    } ${
                      draggingWord === word ? 'is-dragging' : ''
                    }`}
                    onClick={() => {
                      if (!isLocked && placementMode === 'tap') {
                        setSelectedWord((current) =>
                          current === word ? null : word,
                        );
                      }
                    }}
                  >
                    {word}
                    <span>+</span>
                  </button>
                ))}

                {availableWords.length === 0 && (
                  <div className="empty-words">
                    <Icon name="check" />
                    <strong>
                      {wordsLoaded
                        ? 'Đã dùng hết từ khóa'
                        : 'Đang tải từ khóa…'}
                    </strong>
                    <span>
                      {filledCount === 25
                        ? 'Bảng Bingo của bạn đã đầy.'
                        : wordsLoaded
                          ? 'Chờ Trọng tài bổ sung từ khóa.'
                          : 'Vui lòng chờ trong giây lát.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>

      {needsLateConfirmation && (
        <div className="ready-modal-backdrop" role="presentation">
          <section
            className="ready-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ready-modal-title"
          >
            <span className="ready-modal-icon">!</span>
            <p className="eyebrow">VÁN CHƠI ĐÃ BẮT ĐẦU</p>

            <h2 id="ready-modal-title">
              Bạn chưa xác nhận sẵn sàng
            </h2>

            <p>
              {filledCount === 25
                ? 'Bảng của bạn đã hoàn tất. Hãy xác nhận ngay để có thể đánh dấu các ô và tiếp tục ván chơi.'
                : 'Bảng của bạn chưa đủ 25 từ khóa nên chưa thể tham gia ván này. Vui lòng chờ Trọng tài mở ván tiếp theo.'}
            </p>

            {canReady && (
              <button
                type="button"
                className="primary-button"
                onClick={handleReady}
              >
                Xác nhận và tham gia ngay
              </button>
            )}
          </section>
        </div>
      )}

      <Chat playerName={playerName} autoOpenOnce />
    </div>
  );
}