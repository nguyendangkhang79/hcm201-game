import { bingoWords } from './data/bingo';
import { useEffect, useState } from 'react';
import { onValue, push, ref, runTransaction, set, update } from 'firebase/database';
import { db } from './firebase';
import Chat from './Chat';
import './Admin.css';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [wordList, setWordList] = useState([]);
  const [activeWords, setActiveWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [gameStatus, setGameStatus] = useState('waiting');
  const [players, setPlayers] = useState([]);

  const ADMIN_PIN = '123456';

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    runTransaction(ref(db, 'courses/vnr202/gameState/wordList'), current => current === null ? bingoWords : undefined).catch(() => alert('Không thể khởi tạo từ khóa VNR202. Kiểm tra kết nối Firebase.'));

    const unsubscribeWords = onValue(
      ref(db, 'courses/vnr202/gameState/wordList'),
      (snapshot) =>
        setWordList(Object.values(snapshot.val() || bingoWords)),
    );

    const unsubscribeActive = onValue(
      ref(db, 'courses/vnr202/gameState/activeWords'),
      (snapshot) =>
        setActiveWords(Object.values(snapshot.val() || {})),
    );

    const unsubscribeStatus = onValue(
      ref(db, 'courses/vnr202/gameState/status'),
      (snapshot) => setGameStatus(snapshot.val() || 'waiting'),
    );

    const unsubscribePlayers = onValue(
      ref(db, 'courses/vnr202/gameState/players'),
      (snapshot) =>
        setPlayers(Object.values(snapshot.val() || {})),
    );

    return () => {
      unsubscribeWords();
      unsubscribeActive();
      unsubscribeStatus();
      unsubscribePlayers();
    };
  }, [isAuthenticated]);

  const handleLogin = (event) => {
    event.preventDefault();

    if (pinCode === ADMIN_PIN) {
      setIsAuthenticated(true);
    } else {
      alert('Sai mã PIN!');
      setPinCode('');
    }
  };

  const handleAddWord = (event) => {
    event.preventDefault();

    const word = newWord.trim();

    if (!word) return;

    if (wordList.includes(word)) {
      alert('Từ này đã tồn tại!');
      return;
    }

    push(ref(db, 'courses/vnr202/gameState/wordList'), word).catch(() =>
      alert(
        'Không thêm được từ khóa! Kiểm tra kết nối hoặc quyền Firebase.',
      ),
    );

    setNewWord('');
  };

  const unlockWord = (word) => {
    if (gameStatus !== 'playing') {
      alert('Vui lòng bắt đầu trò chơi trước khi phát lệnh!');
      return;
    }

    if (!activeWords.includes(word)) {
      push(ref(db, 'courses/vnr202/gameState/activeWords'), word);
    }
  };

  const startGame = () => {
    const readyCount = players.filter(
      (player) => player.ready,
    ).length;

    const notReadyCount = players.length - readyCount;

    if (
      notReadyCount > 0 &&
      !window.confirm(
        `${notReadyCount}/${players.length} người chơi chưa sẵn sàng. Bạn vẫn muốn bắt đầu ván?`,
      )
    ) {
      return;
    }

    set(ref(db, 'courses/vnr202/gameState/status'), 'playing');
  };

  const resetMatch = () => {
    if (
      window.confirm(
        'Bắt đầu ván mới? Toàn bộ dấu Bingo và bảng xếp hạng hiện tại sẽ bị xóa.',
      )
    ) {
      update(ref(db, 'courses/vnr202/gameState'), {
        activeWords: null,
        status: 'waiting',
        winners: null,
        winnerCount: null,
      });
    }
  };

  const readyCount = players.filter(
    (player) => player.ready,
  ).length;

  const allReady =
    players.length > 0 && readyCount === players.length;

  const pendingCount = wordList.filter(
    (word) => !activeWords.includes(word),
  ).length;

  const statusLabel =
    gameStatus === 'playing'
      ? 'Đang diễn ra'
      : gameStatus === 'ended'
        ? 'Đã kết thúc'
        : 'Đang chuẩn bị';

  if (!isAuthenticated) {
    return (
      <div className="admin-page admin-login-page">
        <main className="admin-login-card">
          <div className="admin-login-brand">
            <span aria-hidden="true">★</span>
            DẤU ẤN LỊCH SỬ ĐẢNG
          </div>

          <p className="admin-eyebrow">KHU VỰC QUẢN LÍ</p>
          <h1>Xác thực Trọng tài</h1>

          <p className="admin-login-description">
            Nhập mã PIN để điều khiển phòng Bingo.
          </p>

          <form
            onSubmit={handleLogin}
            className="admin-login-form"
          >
            <label htmlFor="admin-pin">Mã PIN</label>

            <input
              id="admin-pin"
              className="admin-input admin-pin-input"
              type="password"
              placeholder="Nhập mã PIN…"
              value={pinCode}
              onChange={(event) =>
                setPinCode(event.target.value)
              }
              autoFocus
            />

            <button
              type="submit"
              className="admin-button admin-button-primary"
            >
              Mở khóa quản lí
            </button>
          </form>

          <a className="admin-home-link" href="/">
            ← Về trang chủ
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <a
            className="admin-brand"
            href="/"
            aria-label="Dấu ấn lịch sử Đảng - Trang chủ"
          >
            <span
              className="admin-brand-mark"
              aria-hidden="true"
            >
              ★
            </span>

            <span>
              <strong>DẤU ẤN LỊCH SỬ ĐẢNG</strong>
              <small>QUẢN LÍ PHÒNG BINGO</small>
            </span>
          </a>

          <a
            className="admin-live-link"
            href="/live"
            target="_blank"
            rel="noreferrer"
          >
            Màn hình trực tiếp
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main className="admin-shell">
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">BẢNG ĐIỀU KHIỂN</p>
            <h1>Quản lí ván Bingo</h1>
            <p>
              Chuẩn bị từ khóa, theo dõi người chơi và công bố
              nội dung.
            </p>
          </div>

          <span
            className={`admin-status admin-status-${gameStatus}`}
          >
            <i aria-hidden="true" />
            {statusLabel}
          </span>
        </div>

        <section
          className="admin-stats"
          aria-label="Tổng quan phòng chơi"
        >
          <article className="admin-stat stat-burgundy">
            <span>Kho từ khóa</span>
            <strong>{wordList.length}</strong>
            <small>Từ khóa trong hệ thống</small>
          </article>

          <article className="admin-stat stat-gold">
            <span>Người chơi</span>
            <strong>{players.length}</strong>
            <small>Đang có trong phòng</small>
          </article>

          <article className="admin-stat stat-green">
            <span>Đã sẵn sàng</span>
            <strong>
              {readyCount}
              <em>/{players.length}</em>
            </strong>
            <small>Người chơi đã xác nhận</small>
          </article>

          <article className="admin-stat stat-burgundy">
            <span>Đã công bố</span>
            <strong>{activeWords.length}</strong>
            <small>
              {pendingCount} từ khóa chưa công bố
            </small>
          </article>
        </section>

        <div className="admin-workspace">
          <div className="admin-main-column">
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <span className="admin-section-number">01</span>
                <div>
                  <h2>Chuẩn bị từ khóa</h2>
                  <p>
                    Thêm thuật ngữ vào kho dùng chung cho phòng
                    chơi.
                  </p>
                </div>
              </div>

              <form
                className="admin-add-form"
                onSubmit={handleAddWord}
              >
                <label
                  className="admin-field-label"
                  htmlFor="admin-new-word"
                >
                  Từ khóa mới
                </label>

                <div className="admin-add-row">
                  <input
                    id="admin-new-word"
                    className="admin-input"
                    type="text"
                    value={newWord}
                    onChange={(event) =>
                      setNewWord(event.target.value)
                    }
                    placeholder="Nhập thuật ngữ…"
                  />

                  <button
                    type="submit"
                    className="admin-button admin-button-primary"
                  >
                    <span aria-hidden="true">+</span>
                    Thêm từ khóa
                  </button>
                </div>
              </form>

              <p className="admin-field-hint">
                Kho đang có <strong>{wordList.length}</strong>{' '}
                từ khóa.
              </p>
            </section>

            <section className="admin-panel admin-command-panel">
              <div className="admin-panel-heading">
                <span className="admin-section-number">03</span>
                <div>
                  <h2>Bảng phát lệnh</h2>
                  <p>
                    Chọn từ khóa để công bố cho người chơi khi
                    ván đang diễn ra.
                  </p>
                </div>
              </div>

              <div className="admin-command-summary">
                <span>
                  <i
                    className="admin-legend-dot"
                    aria-hidden="true"
                  />
                  Đã công bố: <strong>{activeWords.length}</strong>
                </span>

                <span>
                  Chưa công bố: <strong>{pendingCount}</strong>
                </span>
              </div>

              <div className="admin-word-grid">
                {wordList.map((word) => {
                  const unlocked = activeWords.includes(word);

                  return (
                    <button
                      type="button"
                      key={word}
                      onClick={() => unlockWord(word)}
                      className={`admin-word ${
                        unlocked ? 'is-unlocked' : ''
                      }`}
                    >
                      <span className="admin-word-text">
                        {word}
                      </span>

                      <small>
                        {unlocked
                          ? '✓ Đã công bố'
                          : 'Công bố từ khóa'}
                      </small>
                    </button>
                  );
                })}
              </div>

              {wordList.length === 0 && (
                <div className="admin-empty">
                  <span aria-hidden="true">＋</span>
                  <strong>Kho từ khóa đang trống</strong>
                  <p>
                    Thêm từ khóa ở phần chuẩn bị để hiển thị
                    bảng phát lệnh.
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside
            className="admin-panel admin-control-panel"
            aria-label="Điều khiển ván chơi"
          >
            <div className="admin-panel-heading">
              <span className="admin-section-number">02</span>
              <div>
                <h2>Điều khiển ván</h2>
                <p>Quản lí trạng thái phòng chơi.</p>
              </div>
            </div>

            <div
              className={`admin-readiness ${
                allReady ? 'is-ready' : ''
              }`}
            >
              <div>
                <span>Người chơi sẵn sàng</span>
                <strong>
                  {readyCount}/{players.length}
                </strong>
              </div>

              <progress
                value={readyCount}
                max={Math.max(players.length, 1)}
                aria-label="Số người chơi sẵn sàng"
              />

              <p>
                {allReady
                  ? 'Tất cả người chơi đã xác nhận sẵn sàng.'
                  : players.length === 0
                    ? 'Chưa có người chơi trong phòng.'
                    : `${players.length - readyCount} người chơi chưa xác nhận sẵn sàng.`}
              </p>
            </div>

            <div className="admin-match-buttons">
              <button
                type="button"
                onClick={startGame}
                disabled={gameStatus !== 'waiting'}
                className="admin-button admin-button-start"
              >
                <span aria-hidden="true">▶</span>
                Bắt đầu
              </button>

              <button
                type="button"
                onClick={() =>
                  set(ref(db, 'courses/vnr202/gameState/status'), 'ended')
                }
                disabled={gameStatus !== 'playing'}
                className="admin-button admin-button-end"
              >
                <span aria-hidden="true">■</span>
                Kết thúc
              </button>
            </div>

            <button
              type="button"
              onClick={resetMatch}
              className="admin-button admin-button-reset"
            >
              <span aria-hidden="true">↻</span>
              Reset ván mới
            </button>

            <p className="admin-control-note">
              Reset xóa các từ đã công bố và bảng xếp hạng,
              giữ lại kho từ khóa.
            </p>

            <div className="admin-data-tools">
              <h3>Quản lí dữ liệu</h3>
              <p>
                Các thao tác xóa cần xác nhận trước khi
                thực hiện.
              </p>

              <button
                type="button"
                onClick={() =>
                  window.confirm('Xóa trắng toàn bộ kho từ khóa?') &&
                  update(ref(db, 'courses/vnr202/gameState'), {
                    wordList: null,
                    activeWords: null,
                  })
                }
                className="admin-button admin-button-delete"
              >
                Xóa kho từ khóa
              </button>

              <button
                type="button"
                onClick={() =>
                  window.confirm('Xóa sạch toàn bộ lịch sử chat?') &&
                  set(ref(db, 'courses/vnr202/chat/messages'), null)
                }
                className="admin-button admin-button-delete"
              >
                Xóa lịch sử chat
              </button>
            </div>
          </aside>
        </div>

        <footer className="admin-footer">
          <span>Dấu ấn lịch sử Đảng</span>
          <span>Khu vực điều hành dành cho Trọng tài</span>
        </footer>
      </main>

      <Chat playerName="Trọng Tài" />
    </div>
  );
}