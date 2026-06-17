import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config"; 

//const STANDINGS_URL =
//    "https://script.google.com/macros/s/AKfycbxYCS1MYTSuINLIXjis_F2tZ-TDxbHsDvpLStaK8H9jiGvPbmfNemx04F3QRGDbNCQX/exec";
//const BRACKET_URL =
//    "https://script.google.com/macros/s/AKfycbxYCS1MYTSuINLIXjis_F2tZ-TDxbHsDvpLStaK8H9jiGvPbmfNemx04F3QRGDbNCQX/exec";

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

function sanitizeImageUrl(url) {
    return String(url || "").replace(".crdownload", "");
}

function normalizeStandingRow(row, i) {
    const gf = Number(pick(row.gf, row.goals_for, row.scored, 0));
    const ga = Number(pick(row.ga, row.goals_against, row.conceded, 0));
    const rawGd = pick(row.gd, row.goal_difference, "");
    const gd = rawGd === "" ? gf - ga : Number(rawGd);

    return {
        position: Number(pick(row.pos, row.position, i + 1)),
        team: normalizeTeamName(row.team || row.club || row.participant || row),
        teamLogo: sanitizeImageUrl(pick(row.team_logo, row.logo, row.teamLogo, "")),
        played: Number(pick(row.p, row.played, row.mp, row.matches, 0)),
        gf,
        ga,
        gd,
        pts: Number(pick(row.pts, row.points, 0)),
        promoColor: pick(row.promo_color, ""),
        promoName: pick(row.promo_name, "")
    };
}

function extractStandingsGroups(payload) {
    const tables = Array.isArray(payload?.tables) ? payload.tables : [];

    return tables
        .filter(table => String(table?.group || "").toLowerCase().startsWith("group "))
        .map((table, index) => ({
            name: `Gruppe ${index + 1}`,
            label: table.group || `Group ${index + 1}`,
            rows: Array.isArray(table?.rows)
                ? table.rows.map((row, i) => normalizeStandingRow(row, i))
                : []
        }));
}

function extractBestThirds(payload) {
    const tables = Array.isArray(payload?.tables) ? payload.tables : [];

    const thirdTable = tables.find(table =>
        String(table?.group || "").toLowerCase().includes("third")
    );

    if (!thirdTable || !Array.isArray(thirdTable.rows)) {
        return [];
    }

    return thirdTable.rows.map((row, i) => normalizeStandingRow(row, i));
}

function getScore(match) {
    const h = pick(match?.home_score, match?.scores?.home, match?.goals?.home);
    const a = pick(match?.away_score, match?.scores?.away, match?.goals?.away);
    return h !== "" && a !== "" ? `${h} - ${a}` : "";
}

function getKnockoutRoundName(index) {
    if (index <= 15) return "16-delsfinale";
    if (index <= 23) return "8-delsfinale";
    if (index <= 27) return "Kvartfinale";
    if (index <= 29) return "Semifinale";
    if (index === 30) return "Finale";
    if (index === 31) return "Bronsefinale";
    return "Sluttspill";
}

function getRoundMatchNumber(roundName, index) {
    if (roundName === "16-delsfinale") return index + 1;
    if (roundName === "8-delsfinale") return index - 15;
    if (roundName === "Kvartfinale") return index - 23;
    if (roundName === "Semifinale") return index - 27;
    return 1;
}

function formatMatchDate(rawDate) {
    if (!rawDate) return "";

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
        return String(rawDate);
    }

    return new Intl.DateTimeFormat("nb-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(parsed);
}

function isWinner(winner, sideName, sideKey) {
    if (!winner || !sideName) return false;

    const normalizedWinner = String(winner).trim().toLowerCase();
    const normalizedSideName = String(sideName).trim().toLowerCase();

    return normalizedWinner === normalizedSideName || normalizedWinner === sideKey;
}

function extractBracketMatches(payload) {
    const rounds = Array.isArray(payload?.rounds) ? payload.rounds : [];
    const actualBracketRound = rounds.find(
        round => round?.name === "match_ups" && Array.isArray(round?.matchups)
    );

    if (!actualBracketRound) {
        console.log("Fant ikke round 'match_ups' i bracket payload:", payload);
        return [];
    }

    return actualBracketRound.matchups.map((match, index) => {
        const roundName = getKnockoutRoundName(index);
        const matchNumber = getRoundMatchNumber(roundName, index);
        const home = normalizeTeamName(match?.home);
        const away = normalizeTeamName(match?.away);
        const winner = pick(match?.winner, match?.winning_side, match?.winner_name, "");
        const dateRaw = pick(
            match?.date,
            match?.match_date,
            match?.start_date,
            match?.start_time,
            match?.kickoff,
            match?.kickoff_at,
            match?.datetime,
            match?.scheduled_at,
            ""
        );
        const status = pick(match?.status, match?.state, match?.match_status, "");

        return {
            id: `${roundName}-${matchNumber}`,
            round: roundName,
            matchNumber,
            name: `${roundName} ${matchNumber}`,
            home,
            away,
            homeLogo: sanitizeImageUrl(match?.home_logo),
            awayLogo: sanitizeImageUrl(match?.away_logo),
            score: getScore(match),
            status,
            winner,
            dateRaw,
            dateLabel: formatMatchDate(dateRaw),
            homeIsWinner: isWinner(winner, home, "home"),
            awayIsWinner: isWinner(winner, away, "away")
        };
    });
}

function groupMatchesByRound(matches) {
    return {
        "16-delsfinale": matches.filter(match => match.round === "16-delsfinale"),
        "8-delsfinale": matches.filter(match => match.round === "8-delsfinale"),
        "Kvartfinale": matches.filter(match => match.round === "Kvartfinale"),
        "Semifinale": matches.filter(match => match.round === "Semifinale"),
        "Finale": matches.filter(match => match.round === "Finale"),
        "Bronsefinale": matches.filter(match => match.round === "Bronsefinale")
    };
}

function TeamLogo({ src, alt, size = 20 }) {
    if (!src) {
        return <div style={{ width: size, height: size, flex: `0 0 ${size}px` }} />;
    }

    return (
        <img
            src={src}
            alt={alt}
            style={{
                width: size,
                height: size,
                objectFit: "contain",
                flex: `0 0 ${size}px`
            }}
            onError={event => {
                event.currentTarget.style.display = "none";
            }}
        />
    );
}

function TeamCell({ row }) {
    return (
        <div style={styles.teamCell}>
            <TeamLogo src={row.teamLogo} alt={row.team} size={20} />
            <div style={styles.teamTextWrap}>
                <div style={styles.teamNameText} title={row.team}>{row.team}</div>
                {row.promoName ? (
                    <div style={{ ...styles.promoText, color: row.promoColor || "#19843E" }}>
                        {row.promoName}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function StandingTable({ rows }) {
    return (
        <div style={styles.tableWrapper}>
            <table className="live-table" style={styles.table}>
                <colgroup>
                    <col style={{ width: 44 }} />
                    <col style={{ width: 300 }} />
                    <col style={{ width: 44 }} />
                    <col style={{ width: 52 }} />
                    <col style={{ width: 52 }} />
                    <col style={{ width: 52 }} />
                    <col style={{ width: 52 }} />
                </colgroup>
                <thead>
                    <tr>
                        <th style={{ ...th, textAlign: "center" }}>Pos</th>
                        <th style={th}>Lag</th>
                        <th style={{ ...th, textAlign: "center" }}>S</th>
                        <th style={{ ...th, textAlign: "center" }}>MF</th>
                        <th style={{ ...th, textAlign: "center" }}>MM</th>
                        <th style={{ ...th, textAlign: "center" }}>MD</th>
                        <th style={{ ...th, textAlign: "center" }}>P</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={`${row.team}-${index}`}
                            style={{
                                backgroundColor: row.promoColor
                                    ? `${row.promoColor}16`
                                    : index % 2 === 0
                                        ? "#ffffff"
                                        : "#fafafa"
                            }}
                        >
                            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                                {row.position}
                            </td>
                            <td style={td}>
                                <TeamCell row={row} />
                            </td>
                            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                                {row.played}
                            </td>
                            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                                {row.gf}
                            </td>
                            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                                {row.ga}
                            </td>
                            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                                {row.gd}
                            </td>
                            <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                                {row.pts}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function BracketTeamRow({ name, logo, winner = false }) {
    return (
        <div
            style={{
                ...styles.bracketTeamRow,
                ...(winner ? styles.bracketTeamRowWinner : null)
            }}
        >
            <TeamLogo src={logo} alt={name || "TBD"} size={18} />
            <span style={{ ...styles.bracketTeamName, ...(winner ? styles.bracketTeamNameWinner : null) }} title={name || "TBD"}>
                {name || "TBD"}
            </span>
            {winner ? <span style={styles.winnerBadge}>Vinner</span> : null}
        </div>
    );
}

function MatchMeta({ match }) {
    const hasMeta = match.dateLabel || match.status;
    if (!hasMeta) return null;
    return (
        <div style={styles.matchMetaRow}>
            {match.dateLabel ? <span style={styles.matchMetaPill}>{match.dateLabel}</span> : null}
            {match.status ? <span style={{ ...styles.matchMetaPill, ...styles.statusPill }}>{match.status}</span> : null}
        </div>
    );
}

function MatchCard({ match, compact = false }) {
    return (
        <div
            style={{
                ...styles.matchCard,
                minHeight: compact ? 112 : 124,
                width: compact ? 270 : 290
            }}
        >
            <div style={styles.matchHeader}>
                <span style={styles.matchTitle}>{match.name}</span>
                <span style={styles.scorePill}>{match.score || "-"}</span>
            </div>

            <MatchMeta match={match} />

            <BracketTeamRow
                name={match.home}
                logo={match.homeLogo}
                winner={match.homeIsWinner}
            />
            <BracketTeamRow
                name={match.away}
                logo={match.awayLogo}
                winner={match.awayIsWinner}
            />
        </div>
    );
}

function KnockoutBracket({ groupedMatches }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {Object.entries(groupedMatches).map(([roundName, matches]) => {
                if (!matches || matches.length === 0) return null;

                return (
                    <div key={roundName} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={styles.roundHeading}>{roundName}</div>
                        <div style={styles.roundMatchGrid}>
                            {matches.map(match => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    compact
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function LivePage() {
    const [groups, setGroups] = useState({});
    const [thirds, setThirds] = useState([]);
    const [matches, setMatches] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
    async function load() {
        try {
            setLoading(true);
            setError("");
    
            // Bruk samme proxy-endepunkter som LeaderboardPage
            const [standingsRes, bracketRes] = await Promise.all([
                fetch(`${API_BASE}?action=liveParsed`),
                fetch(`${API_BASE}?action=liveBracketParsed`)
            ]);
    
            if (!standingsRes.ok) {
                throw new Error(`Standings-feil: ${standingsRes.status}`);
            }
            if (!bracketRes.ok) {
                throw new Error(`Bracket-feil: ${bracketRes.status}`);
            }
    
            const standingsRaw = await standingsRes.json();
            const bracketRaw = await bracketRes.json();
    
            const standings = standingsRaw?.data;
            const bracket = bracketRaw?.data;
    
            if (!standings) {
                throw new Error("Standings mangler 'data'-felt");
            }
            if (!bracket) {
                throw new Error("Bracket mangler 'data'-felt");
            }
    
            // Her antar vi at backend nå returnerer ferdig-parset struktur:
            // standings.groups: { A: [...], B: [...], ... }
            // standings.thirds: [...]
            // bracket.knockout: { ... }
            const normalizedGroups = {};
                for (const [letter, rows] of Object.entries(standings.groups || {})) {
                    normalizedGroups[letter] = rows.map((row, i) => normalizeStandingRow(row, i));
                }
            setGroups(normalizedGroups);
        
            setThirds(standings.thirds || []);
            setMatches(bracket.knockout || {});
    
            try {
                const liveActual = {
                    groups: standings.groups || {},
                    knockout: bracket.knockout || {}
                };
                localStorage.setItem("actual_live", JSON.stringify(liveActual));
            } catch {
                // ignorer lagringsfeil
            }
    
        } catch (err) {
            console.error("LOAD FEIL:", err);
            setError(err instanceof Error ? err.message : "Ukjent feil");
        } finally {
            setLoading(false);
        }
    }

    load();
}, []);

    // const groupedMatches = useMemo(() => groupMatchesByRound(matches), [matches]);
    const groupedMatches = useMemo(() => {
        return {
            r32: matches.r32 || [],
            r16: matches.r16 || [],
            qf: matches.qf || [],
            sf: matches.sf || [],
            f: matches.f || []
        };
    }, [matches]);

    if (loading) {
        return <div style={styles.stateMessage}>Laster...</div>;
    }
    
    if (error) {
        return <div style={{ ...styles.stateMessage, color: "crimson" }}>{error}</div>;
    }
    
    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.pageTitle}>VM Oversikt</h1>
                    <div style={styles.pageSubtitle}>
                        Gruppespill, beste treere og sluttspill i én oversikt.
                    </div>
                </div>
            </div>
    
            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Grupper</h2>
                {Object.entries(groups).map(([letter, rows]) => (
                    <div key={letter} style={styles.groupBlock}>
                        <h3 style={styles.groupTitle}>Gruppe {letter}</h3>
                        <StandingTable rows={rows} />
                    </div>
                ))}
            </section>
    
            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Beste treere</h2>
                {thirds.length === 0 ? (
                    <div style={styles.emptyState}>Fant ingen tredjeplasser.</div>
                ) : (
                    <StandingTable rows={thirds} />
                )}
            </section>
    
            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Sluttspill</h2>
                {Object.keys(matches).length === 0 ? (
                    <div style={styles.emptyState}>Fant ingen sluttspillkamper.</div>
                ) : (
                    <KnockoutBracket groupedMatches={groupedMatches} />
                )}
            </section>
        </div>
    );
}
    
const styles = {
    page: {
        padding: 20,
        minHeight: "100vh",
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20
    },
    pageTitle: {
        margin: 0,
        fontSize: 32,
        lineHeight: 1.1
    },
    pageSubtitle: {
        marginTop: 8,
        color: "#6b7280",
        fontSize: 14
    },
    section: {
        marginBottom: 32
    },
    sectionTitle: {
        margin: "0 0 14px 0",
        fontSize: 24
    },
    groupBlock: {
        marginBottom: 18
    },
    groupTitle: {
        margin: "0 0 10px 0",
        fontSize: 18
    },
    stateMessage: {
        padding: 20
    },
    emptyState: {
        padding: 16,
        border: "1px dashed #d1d5db",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        color: "#6b7280"
    },
    tableWrapper: {
        overflowX: "auto",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
    },
    table: {
        width: "100%",
        minWidth: 590,
        tableLayout: "fixed",
        borderCollapse: "collapse",
    },
    teamCell: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0
    },
    teamTextWrap: {
        minWidth: 0,
        flex: 1
    },
    teamNameText: {
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontWeight: 600
    },
    promoText: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
    },
    roundHeading: {
        fontSize: 18,
        fontWeight: 800,
        color: "#1f2937"
    },
    roundMatchGrid: {
        display: "flex",
        flexWrap: "wrap",
        gap: 12
    },
    matchCard: {
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 12,
        boxShadow: "0 6px 18px rgba(17,24,39,0.06)"
    },
    matchHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        marginBottom: 10
    },
    matchTitle: {
        fontSize: 13,
        fontWeight: 800,
        color: "#374151"
    },
    scorePill: {
        backgroundColor: "#111827",
        color: "#ffffff",
        borderRadius: 999,
        padding: "4px 8px",
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1
    },
    matchMetaRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 10
    },
    matchMetaPill: {
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 8px",
        backgroundColor: "#eef2ff",
        color: "#4338ca",
        fontSize: 12,
        fontWeight: 700
    },
    statusPill: {
        backgroundColor: "#f3f4f6",
        color: "#374151"
    },
    bracketTeamRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 32,
        padding: "6px 8px",
        borderRadius: 10,
        backgroundColor: "#f9fafb",
        border: "1px solid transparent"
    },
    bracketTeamRowWinner: {
        backgroundColor: "#ecfdf5",
        border: "1px solid #86efac"
    },
    bracketTeamName: {
        display: "inline-block",
        maxWidth: 180,
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontSize: 14,
        fontWeight: 600
    },
    bracketTeamNameWinner: {
        color: "#166534"
    },
    winnerBadge: {
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "3px 8px",
        backgroundColor: "#16a34a",
        color: "#ffffff",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1
    }
};

const th = {
    borderBottom: "1px solid #e5e7eb",
    padding: "10px 8px",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 800,
    color: "#374151",
    backgroundColor: "#f9fafb"
};

const td = {
    borderBottom: "1px solid #f0f2f5",
    padding: "10px 8px",
    verticalAlign: "middle",
    fontSize: 14
};
