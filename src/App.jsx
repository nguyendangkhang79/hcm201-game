import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Player from "./Player";
import Admin from "./Admin";
import LiveDashboard from "./LiveDashboard";
import Explore from "./Explore";
import Quiz from "./Quiz";
import Bingo from "./Bingo";
import { Link } from "react-router-dom";
import Layout from "./Layout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/bingo" element={<Bingo />} />
        <Route path="/play" element={<Player />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/live" element={<LiveDashboard />} />
        <Route
          path="*"
          element={
            <Layout>
              <section className="page-width section-space">
                <h1>Không tìm thấy trang</h1>
                <Link to="/">Về trang chủ →</Link>
              </section>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
