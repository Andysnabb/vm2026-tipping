
import { API_BASE } from "../config";
import React, { useState, useEffect, useMemo } from "react";

// ============================================================================
// 1. DINE KONSTANTER (Sjekk at API_BASE stemmer med din backend)
// ============================================================================
// const API_BASE = "https://DITT_BACKEND_DOMENE.no/api"; // <-- Legg inn din faktiske backend-URL her!

const STANDINGS_URL = "https://sportscore.com/api/widget/standings/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";
const BRACKET_URL = "https://sportscore.com/api/widget/bracket/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";

// ============================================================================
// 2. HJELPEFUNKSJON FOR Å HENTE LIVE-DATA FRA EKSTERNE API-ER
// ============================================================================
async function fetchExternalLiveData() {
    try {
        const [standingsResponse, bracketResponse] = await Promise.all([
            fetch(STANDINGS_URL),
            fetch(BRACKET_URL)
        ]);

        if (!standingsResponse.ok || !bracketResponse.ok) {
            throw new Error("Kunne ikke hente live-data fra Sportscore");
        }

        const standingsData = await standingsResponse.json();
        const bracketData = await bracketResponse.json();

        const groupNumberToLetter = {
            "1": "A", "2": "B", "3": "C", "4": "D", 
            "5": "E", "6": "F", "7": "G", "8": "H", 
            "9": "I", "10": "J", "11": "K", "12": "L"
        };

        // Del 1: Grupper -> Tar vare på hele rad-objektet (inkludert .p for spilte kamper)
        const tables = Array.isArray(standingsData?.tables) ? standingsData.tables : [];
        const groups = tables
            .filter(table => String(table?.group || "").toLowerCase().startsWith("group "))
            .reduce((acc, g) => {
                const match = String(g.group || "").match(/\d+/);
                const groupNumber = match ? match[0] : null;
                const key = groupNumber ? groupNumberToLetter[groupNumber] : null;
                
                if (key && Array.isArray(g.rows)) {
                    // Vi sender hele rad-objektet videre slik at poengberegningen kan lese .p og .team
                    acc[key] = g.rows;
                }
                return acc;
            }, {});

        // Del 3: Sluttspill
        const knockout = { r32: [], r16: [], qf: [], sf: [], f: [] };
        const rounds = Array.isArray(bracketData?.rounds) ? bracketData.rounds : [];
        const actualBracketRound = rounds.find(r => r?.name === "match_ups" && Array.isArray(r?.matchups));
        
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
        console.error("Feil ved henting av eksterne live-data:", err);
        return { groups: {}, knockout: {} };
    }
}

// ============================================================================
// 3. HOVEDKOMPONENTEN
// ============================================================================
export default function LeaderboardPage() {
    const [data, setData] = useState([]);
    const [actual, setActual] = useState({ groups: {}, part2: {}, knockout: {} });
    const [serverActual, setServerActual] = useState(null);
    const [part2Actual, setPart2Actual] = useState({});
    const [loading, setLoading] = useState(true);

    // POENGBEREGNING DEL 1 (Sjekker om kamper er spilt via .p)
    const pointsPart1 = (participant, currentActual) => {
        if (!participant?.groups || !currentActual?.groups) return 0;
        let score = 0;

        const cleanText = (str) => String(str || "").trim().toLowerCase();

        const cleanGroupKey = (key) => {
            const cleaned = String(key || "").trim().toUpperCase();
            if (cleaned.startsWith("GRUPPE ")) return cleaned.replace("GRUPPE ", "");
            return cleaned;
        };

        const userGroupsCleaned = {};
        Object.entries(participant.groups).forEach(([key, value]) => {
            userGroupsCleaned[cleanGroupKey(key)] = value;
        });

        for (const [groupLetter, actualRows] of Object.entries(currentActual.groups)) {
            const cleanLetter = cleanGroupKey(groupLetter);
            const userOrder = userGroupsCleaned[cleanLetter] || [];
            
            // SJEKK: Har noen av lagene i gruppen spilt en kamp ennå? (.p > 0)
            const hasPlayedMatches = actualRows.some(row => Number(row?.p || 0) > 0);

            // Hvis ingen har spilt, hopper vi over gruppen fullstendig
            if (!hasPlayedMatches) {
                continue;
            }
            
            // Gruppen er i gang! Vi sjekker plasseringene (idx 0 til 3)
            actualRows.forEach((actualRow, idx) => {
                const actualTeam = actualRow?.team || "";
                const userTeam = userOrder[idx];
                
                if (cleanText(userTeam) === cleanText(actualTeam) && cleanText(actualTeam) !== "") {
                    score += 1; // 1 poeng for riktig plass
                    
                    if (idx === 0) {
                        score += 2; // +2 poeng ekstra for riktig gruppevinner
                    }
                }
            });
        }
        
        return score;
    };

    // FUNKSJON FOR Å LASTE ALT I EN OPERASJON
    async function loadLeaderboardData() {
        setLoading(true);
        try {
            const [submissionsRes, actualsRes, liveData] = await Promise.all([
                fetch(`${API_BASE}?action=all`),
                fetch(`${API_BASE}?action=actuals`).then(res => res.json()).catch(() => ({ ok: false, data: null })),
                fetchExternalLiveData()
            ]);

            const submissionsJson = await submissionsRes.json();
            
            if (submissionsJson?.ok && Array.isArray(submissionsJson.data)) {
                setData(submissionsJson.data);
            } else if (Array.isArray(submissionsJson)) {
                setData(submissionsJson);
            } else {
                setData([]);
            }

            const srv = actualsRes?.ok && actualsRes?.data ? actualsRes.data : null;
            setServerActual(srv);

            const combinedActual = {
                groups: liveData.groups || {},
                part2: srv?.part2 || {},
                knockout: liveData.knockout || {}
            };

            setActual(combinedActual);
            setPart2Actual(srv?.part2 || {});

        } catch (error) {
            console.error("Feil ved oppdatering av ledertavle:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLeaderboardData();
    }, []);

    // REKALKULER DELPOENG OG TOTALT MED JSON-PARSING
    const sortedLeaderboard = useMemo(() => {
        return [...data].map(participant => {
            let parsedPart1 = null;
            try {
                if (participant.part1Json) {
                    parsedPart1 = JSON.parse(participant.part1Json);
                }
            } catch (e) {
                console.error("Kunne ikke parse part1Json", e);
            }

            // Regner ut del 1 basert på det dekodede objektet
            const p1 = pointsPart1(parsedPart1, actual);
            const p2 = 0; // Kobles på senere
            const p3 = 0; // Kobles på senere
            const total = p1 + p2 + p3;

            return {
                ...participant,
                p1,
                p2,
                p3,
                total
            };
        }).sort((a, b) => b.total - a.total);
    }, [data, actual]);

    if (loading) {
        return <div style={styles.centerMessage}>Oppdaterer ledertavle med live-resultater...</div>;
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Ledertavle</h1>
                    <div style={styles.subtitle}>Oppdateres automatisk mot livedata</div>
                </div>
                <button onClick={loadLeaderboardData} style={styles.refreshButton}>
                    Oppdater
                </button>
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: "40px", textAlign: "center" }}>Pos</th>
                            <th style={styles.th}>Navn</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>Del 1</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>Del 2</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>Del 3</th>
                            <th style={{ ...styles.thTotal, width: "70px" }}>Totalt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLeaderboard.map((player, index) => (
                            <tr key={player.id || index} style={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                                <td style={styles.tdCenter}>{index + 1}</td>
                                <td style={styles.tdName}>{player.name || player.username || "Ukjent"}</td>
                                <td style={styles.tdScoreCenter}>{player.p1} p</td>
                                <td style={styles.tdScoreCenter}>{player.p2} p</td>
                                <td style={styles.tdScoreCenter}>{player.p3} p</td>
                                <td style={styles.tdPoints}>{player.total} p</td>
                            </tr>
                        ))}
                        {sortedLeaderboard.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ ...styles.tdCenter, padding: "24px" }}>
                                    Ingen deltakere funnet. Sjekk API-tilkoblingen din.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// 5. STYLING
// ============================================================================
const styles = {
    page: { padding: "12px", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
    title: { fontSize: "22px", margin: 0, fontWeight: "bold", color: "#111827" },
    subtitle: { fontSize: "12px", color: "#6b7280", marginTop: "4px" },
    refreshButton: { padding: "6px 12px", backgroundColor: "#1f2937", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" },
    centerMessage: { padding: "40px", textAlign: "center", color: "#6b7280", fontFamily: "sans-serif", fontSize: "14px" },
    tableWrapper: { border: "1px solid #e5e7eb", borderRadius: "8px", overflowX: "auto", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "500px" },
    th: { backgroundColor: "#f9fafb", padding: "10px 8px", textTransform: "uppercase", fontSize: "11px", fontWeight: "700", color: "#4b5563", textAlign: "left", borderBottom: "1px solid #e5e7eb" },
    thTotal: { backgroundColor: "#f9fafb", padding: "10px 8px", textTransform: "uppercase", fontSize: "11px", fontWeight: "700", color: "#111827", textAlign: "right", borderBottom: "1px solid #e5e7eb" },
    trEven: { backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" },
    trOdd: { backgroundColor: "#fafafa", borderBottom: "1px solid #e5e7eb" },
    tdCenter: { padding: "10px 8px", textAlign: "center", color: "#6b7280" },
    tdScoreCenter: { padding: "10px 8px", textAlign: "center", color: "#4b5563", fontVariantNumeric: "tabular-nums" },
    tdName: { padding: "10px 8px", fontWeight: "600", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    tdPoints: { padding: "10px 8px", textAlign: "right", fontWeight: "700", color: "#059669", fontVariantNumeric: "tabular-nums" }
};