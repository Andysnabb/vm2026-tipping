import { Link, Routes, Route, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Part1Page from "./pages/Part1Page";
import Part2Page from "./pages/Part2Page";
import Part3Page from "./pages/Part3Page";
import AnswersPage from "./pages/AnswersPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LivePage from "./pages/LivePage";

function NavLinkButton({ to, children }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={`nav-button ${isActive ? "active" : ""}`}
        >
            {children}
        </Link>
    );
}

export default function App() {
    return (
        <div className="container">
            <h1>VM Tipping 2026</h1>

            <nav className="nav-buttons">
                <NavLinkButton to="/">Hjem</NavLinkButton>
                <NavLinkButton to="/part1">Del 1</NavLinkButton>
                <NavLinkButton to="/part2">Del 2</NavLinkButton>
                <NavLinkButton to="/part3">Del 3</NavLinkButton>
                <NavLinkButton to="/answers">Alle svar</NavLinkButton>
                <NavLinkButton to="/leaderboard">Poeng</NavLinkButton>
                <NavLinkButton to="/live">Livedata</NavLinkButton>
            </nav>

            <div className="card">
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
        </div>
    );
}
