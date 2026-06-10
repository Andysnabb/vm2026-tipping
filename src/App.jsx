import { Link, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Part1Page from "./pages/Part1Page";
import Part2Page from "./pages/Part2Page";
import Part3Page from "./pages/Part3Page";
import AnswersPage from "./pages/AnswersPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LivePage from "./pages/LivePage";

export default function App() {
    return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
            <h1>VM Tipping 2026</h1>

            <nav style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to="/">Hjem</Link>
                <Link to="/part1">Del 1</Link>
                <Link to="/part2">Del 2</Link>
                <Link to="/part3">Del 3</Link>
                <Link to="/answers">Alle svar</Link>
                <Link to="/leaderboard">Poeng</Link>
                <Link to="/live">Livedata</Link>
            </nav>

            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/part1" element={<Part1Page />} />
                <Route path="/part2" element={<Part2Page />} />
                <Route path="/part3" element={<Part3Page />} />
                <Route path="/answers" element={<AnswersPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/live" element={<LivePage />} />
            </Routes>
        </div>
    );
}
