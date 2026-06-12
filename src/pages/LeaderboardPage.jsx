import React, { useState, useEffect, useMemo } from "react";

// ============================================================================
// 1. KONSTANTER OG EKSTERNE URL-ER
// ============================================================================
const API_BASE = "../config"; // OBS: Sjekk at denne matcher din gamle verdi!

const STANDINGS_URL = "https://sportscore.com/api/widget/standings/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";
const BRACKET_URL = "https://sportscore.com/api/widget/bracket/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";

// Fallback/standard-objekt hvis alt feiler
const ACTUAL_DEFAULT = {
    groups: {},
    part2: {},
    knockout: { r32: [], r16: [], qf: [], sf: [], f: [] }
};

// ============================================================================
// 2. HJELPEFUNKSJON FOR Å HENTE LIVE-DATA (DEL 1 OG DEL 3) FRA SPORTBOARDS
// ============================================================================
async function fetchExternalLiveData() {
    try {
        const [standingsResponse, bracketResponse] = await Promise.all([
            fetch(STANDINGS_URL),
            fetch(BRACKET_URL)
        ]);

        if (!standingsResponse.ok) throw new Error(`Standings API feilet: ${standingsResponse.status}`);
        if (!bracketResponse.ok) throw new Error(`Bracket API feilet: ${bracketResponse.status}`);

        const standingsData = await standingsResponse.json();
        const bracketData = await bracketResponse.json();

        // Formater Del 1 (Grupper) -> { A: ["Lag 1", "Lag 2", ...], B: [...] }
        const tables = Array.isArray(standingsData?.tables) ? standingsData.tables : [];
        const groups = tables
            .filter(table => String(table?.group || "").toLowerCase().startsWith("group "))
            .reduce((acc, g) => {
                const match = String(g.label || "").match(/([A-L])/i);
                const key = match ? match[1].toUpperCase() : null;
                
                if (key && Array.isArray(g.rows)) {
                    acc[key] = g.rows.map(row => {
                        const v = row.team || row.club || row.participant || row;
                        if (!v) return "";
                        if (typeof v === "string") return v.trim();
                        return String(v.name || v.team_name || v.title || "").trim();
                    });
                }
                return acc;
            }, {});

        // Formater Del 3 (Sluttspill) ut fra bracket-kampene
        const rounds = Array.isArray(bracketData?.rounds) ? bracketData.rounds : [];
        const actualBracketRound = rounds.find(r => r?.name === "match_ups" && Array.isArray(r?.matchups));
        
        const knockout = { r32: [], r16: [], qf: [], sf: [], f: [] };

        if (actualBracketRound) {
            actualBracketRound.matchups.forEach((match, index) => {
                const getTeamName = (teamObj) => {
                    if (!teamObj) return "";
                    if (typeof teamObj === "string") return teamObj.trim();
                    return String(teamObj.name || teamObj.team_name || teamObj.title || "").trim();
                };

                const home = getTeamName(match?.home);
                const away = getTeamName(match?.away);
                
                if (index <= 15) {
                    if (home) knockout.r32.push(home);
                    if (away) knockout.r32.push(away);
                } else if (index <= 23) {
                    if (home) knockout.r16.push(home);
                    if (away) knockout.r16.push(away);
                } else if (index <= 27) {
                    if (home) knockout.qf.push(home);
                    if (away) knockout.qf.push(away);
                } else if (index <= 29) {
                    if (home) knockout.sf.push(home);
                    if (away) knockout.sf.push(away);
                } else if (index === 30) {
                    if (home) knockout.f.push(home);
                    if (away) knockout.f.push(away);
                }
            });
        }

        return { groups, knockout };
    } catch (err) {
        console.error("Feil under parsing av eksterne live-data:", err);
        return { groups: {}, knockout: { r32: [], r16: [], qf: [], sf: [], f: [] } };
    }
}

// Dummy-funksjon i tilfelle du kaller getActuals() i koden din
async function getActuals() {
    try {
        const res = await fetch(`${API_BASE}?action=actuals`);
        return await res.json();
    } catch (e) {
        return { ok: false, data: null };
    }
}

// ============================================================================
// 3. HOVEDKOMPONENTEN: LEADERBOARDPAGE
// ============================================================================
export default function LeaderboardPage() {
    const [data, setData] = useState([]);
    const [actual, setActual] = useState(ACTUAL_DEFAULT);
    const [serverActual, setServerActual] = useState(null);
    const [part2Actual, setPart2Actual] = useState({});
    const [loading, setLoading] = useState(true);

    // Poengberegningsfunksjon for Del 1 (Lagt inn lokalt for sikkerhetsskyld)
    const pointsPart1 = (participant, currentActual) => {
        let score = 0;
        if (!participant?.groups || !currentActual?.groups) return 0;
        
        // Looper gjennom grupper (A, B, C osv)
        for (const [groupLetter, actualOrder] of Object.entries(currentActual.groups)) {
            const userOrder = participant.groups[groupLetter] || [];
            // Enkel sjekk: gir poeng per lag som ligger på nøyaktig rett plass
            actualOrder.forEach((team, idx) => {
                if (userOrder[idx] === team) {
                    score += 4; // Endre poengsum per treff her om nødvendig
                }
            });
        }
        return score;
    };

    // Hovedfunksjon for å laste og synkronisere data
    async function loadLeaderboardData() {
        setLoading(true);
        try {
            const [submissionsRes, actualsRes, liveData] = await Promise.all([
                fetch(`${API_BASE}?action=all`),
                getActuals(),
                fetchExternalLiveData()
            ]);

            // Håndter deltakernes kuponger
            const submissionsJson = await submissionsRes.json();
            let participantsData = [];
            if (submissionsJson?.ok) {
                participantsData = Array.isArray(submissionsJson.data) ? submissionsJson.data : [];
                setData(participantsData);
            } else {
                setData([]);
            }

            // Håndter backend-fasit (Del 2)
            const srv = actualsRes?.ok && actualsRes?.data ? actualsRes.data : null;
            setServerActual(srv);

            // Flett sammen live-data fra API og dine egne manuelt lagrede Del 2-data
            const combinedActual = {
                groups: liveData.groups || {},
                part2: srv?.part2 || {},
                knockout: liveData.knockout || {}
            };

            setActual(combinedActual);
            setPart2Actual(srv?.part2 || {});

            // DEBUG-LOGG (Sjekk denne på en PC når du kan for å se om lagnavnene matcher)
            console.log("=== LIVE SYNKRONISERING AKTIV ===");
            console.log("Generert fasit-objekt:", combinedActual);

        } catch (error) {
            console.error("Kritisk feil ved lasting av ledertavle:", error);
            setActual(ACTUAL_DEFAULT);
        } finally {
            setLoading(false);
        }
    }

    // Kjør datalasting automatisk når komponenten mounter (siden åpnes)
    useEffect(() => {
        loadLeaderboardData();
    }, []);

    // Sorter deltakerne basert på poengsummen deres (Del 1 i dette eksempelet)
    const sortedLeaderboard = useMemo(() => {
        return [...data].map(participant => {
            const p1 = pointsPart1(participant, actual);
            // Legg til p2 og p3 her hvis du har de funksjonene klare
            const total = p1; 
            return { ...participant, points: total };
        }).sort((a, b) => b.points - a.points);
    }, [data, actual]);

    // ============================================================================
    // 4. UI RENDER (Visning på skjerm)
    // ============================================================================
    if (loading) {
        return <div style={styles.centerMessage}>Oppdaterer tabeller og poengsummer live...</div>;
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>Ledertavle</h1>
                <button onClick={loadLeaderboardData} style={styles.refreshButton}>
                    Oppdater data
                </button>
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Pos</th>
                            <th style={styles.th}>Navn</th>
                            <th style={styles.thTotal}>Totalt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLeaderboard.map((player, index) => (
                            <tr key={player.id || index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                                <td style={styles.tdCenter}>{index + 1}</td>
                                <td style={styles.tdName}>{player.name || "Ukjent deltaker"}</td>
                                <td style={styles.tdPoints}>{player.points} p</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// 5. STYLES (Enkel, mobilvennlig styling)
// ============================================================================
const styles = {
    page: { padding: "16px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
    title: { fontSize: "24px", margin: 0, fontWeight: "bold" },
    refreshButton: { padding: "8px 12px", backgroundColor: "#0070f3", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" },
    centerMessage: { padding: "40px", textAlign: "center", color: "#666", fontFamily: "sans-serif" },
    tableWrapper: { border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "15px" },
    th: { backgroundColor: "#f9fafb", padding: "12px", textTransform: "uppercase", fontSize: "12px", color: "#6b7280", textAlign: "left", borderBottom: "1px solid #e5e7eb" },
    thTotal: { backgroundColor: "#f9fafb", padding: "12px", textTransform: "uppercase", fontSize: "12px", color: "#6b7280", textAlign: "right", borderBottom: "1px solid #e5e7eb" },
    trEven: { backgroundColor: "#fff", borderBottom: "1px solid #f3f4f6" },
    trOdd: { backgroundColor: "#fafafa", borderBottom: "1px solid #f3f4f6" },
    tdCenter: { padding: "12px", textAlign: "center", width: "40px", color: "#6b7280" },
    tdName: { padding: "12px", fontWeight: "600" },
    tdPoints: { padding: "12px", textAlign: "right", fontWeight: "bold", color: "#10b981" }
};