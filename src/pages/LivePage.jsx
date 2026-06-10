import { useEffect, useMemo, useState } from "react";

const STANDINGS_URL =
    "https://sportscore.com/api/widget/standings/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";
const BRACKET_URL =
    "https://sportscore.com/api/widget/bracket/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";

function pick(...values) {
    for (const v of values) {
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return "";
}

function normalizeTeamName(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    return v.name || v.team_name || v.title || v.label || v.slug || "";
}

function normalizeStandingRow(row, i) {
    return {
        position: Number(pick(row.pos, row.position, i + 1)),
        team: normalizeTeamName(row),
        played: Number(pick(row.p, row.played, 0)),
        gf: Number(pick(row.gf, row.goals_for, 0)),
        ga: Number(pick(row.ga, row.goals_against, 0)),
        gd: Number(pick(row.gd, row.goal_difference, 0)),
        pts: Number(pick(row.pts, row.points, 0))
    };
}

function extractStandingsGroups(payload) {
    const tables = Array.isArray(payload?.tables) ? payload.tables : [];

    return tables
        .filter(table => String(table?.group || "").toLowerCase().startsWith("group"))
        .map((table, index) => ({
            name: `Gruppe ${index + 1}`,
            rows: Array.isArray(table?.rows)
                ? table.rows.map((row, i) => normalizeStandingRow(row, i))
                : []
        }));
}

function extractBracketMatches(payload) {
    const rounds = Array.isArray(payload?.rounds) ? payload.rounds : [];
    const round = rounds.find(r => Array.isArray(r?.matchups));
    if (!round) return [];

    return round.matchups.map((match, i) => ({
        id: i,
        home: normalizeTeamName(match.home),
        away: normalizeTeamName(match.away),
        score: `${match.home_score ?? "-"} - ${match.away_score ?? "-"}`
    }));
}

function StandingTable({ rows }) {
    return (
        <div className="card">
            <table className="live-table">
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Lag</th>
                        <th>S</th>
                        <th>MF</th>
                        <th>MM</th>
                        <th>MD</th>
                        <th>P</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i}>
                            <td>{row.position}</td>
                            <td>{row.team}</td>
                            <td>{row.played}</td>
                            <td>{row.gf}</td>
                            <td>{row.ga}</td>
                            <td>{row.gd}</td>
                            <td><strong>{row.pts}</strong></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function LivePage() {
    const [groups, setGroups] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [standingsRes, bracketRes] = await Promise.all([
                    fetch(STANDINGS_URL),
                    fetch(BRACKET_URL)
                ]);

                const standingsData = await standingsRes.json();
                const bracketData = await bracketRes.json();

                setGroups(extractStandingsGroups(standingsData));
                setMatches(extractBracketMatches(bracketData));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    if (loading) {
        return <div className="container">Laster...</div>;
    }

    return (
        <div className="container">
            <h1>VM Oversikt</h1>

            <section>
                <h2>Grupper</h2>
                {groups.map((group, i) => (
                    <div key={i}>
                        <h3>{group.name}</h3>
                        <StandingTable rows={group.rows} />
                    </div>
                ))}
            </section>

            <section>
                <h2>Sluttspill</h2>
                <div className="card">
                    {matches.map(m => (
                        <div key={m.id} style={{ marginBottom: 8 }}>
                            {m.home} vs {m.away} ({m.score})
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
