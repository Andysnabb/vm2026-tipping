import React, { useState, useEffect, useMemo } from "react";
import { getActuals, saveActual } from "../lib/api"; 
import { API_BASE } from "../config"; 

// Eksterne API-er for live-data
const STANDINGS_URL = "https://sportscore.com/api/widget/standings/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";
const BRACKET_URL = "https://sportscore.com/api/widget/bracket/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";

const SCORERS = [ 
    "Álvarez (ARG)", "Balogun (USA)", "Dembélé (FRA)", "Depay (NED)", 
    "Haaland (NOR)", "Kane (ENG)", "Lukaku (BEL)", "Martínez (ARG)", 
    "Mbappé (FRA)", "Messi (ARG)", "Oyarzabal (ESP)", "Pulisic (USA)", 
    "Raphinha (BRA)", "Rashford (ENG)", "Ronaldo (POR)", "Saka (ENG)", 
    "Torres (ESP)", "Vinícius Jr. (BRA)", "Woltemade (GER)", "Yamal (ESP)", 
    "(en annen)" 
]; 

const TEAMS = [ 
    "Algerie", "Argentina", "Australia", "Belgia", "Bosnia-Hercegovina", 
    "Brasil", "Canada", "Colombia", "Curacao", "DR Kongo", "Ecuador", 
    "Egypt", "Elfenbenskysten", "England", "Frankrike", "Ghana", "Haiti", 
    "Irak", "Iran", "Japan", "Jordan", "Kapp Verde", "Kroatia", "Marokko", 
    "Mexico", "Nederland", "New Zealand", "Norge", "Panama", "Paraguay", 
    "Portugal", "Qatar", "Saudi-Arabia", "Senegal", "Skottland", "Spania", 
    "Sveits", "Sverige", "Sør-Afrika", "Sør-Korea", "Tsjekkia", "Tunisia", 
    "Tyrkia", "Tyskland", "Uruguay", "USA", "Usbekistan", "Østerrike" 
]; 

const TOTAL_GOALS_OPTIONS = ["250 el. færre", "251-275", "276-305", "306-330", "331 el. flere"]; 
const HUB_OPTIONS = ["H", "U", "B"]; 

// Hjelpefunksjon for å hente live-data fra Sportscore
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

        const tables = Array.isArray(standingsData?.tables) ? standingsData.tables : [];
        const groups = tables
            .filter(table => String(table?.group || "").toLowerCase().startsWith("group "))
            .reduce((acc, g) => {
                const match = String(g.group || "").match(/\d+/);
                const groupNumber = match ? match[0] : null;
                const key = groupNumber ? groupNumberToLetter[groupNumber] : null;
                
                if (key && Array.isArray(g.rows)) {
                    acc[key] = g.rows;
                }
                return acc;
            }, {});

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

function safeJsonParse(value, fallback = null) { 
    if (!value) return fallback; 
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return fallback; } 
} 

function normalizeAnswer(value) { return String(value ?? "").trim(); } 

function matchesActual(predicted, actual) { 
    const normalizedPredicted = normalizeAnswer(predicted); 
    if (!normalizedPredicted) return false; 
    if (Array.isArray(actual)) { 
        return actual.map(normalizeAnswer).includes(normalizedPredicted); 
    } 
    return normalizedPredicted === normalizeAnswer(actual); 
} 

// ============================================================================
// POENGBEREGNINGER
// ============================================================================
function pointsPart1(participantParsed, currentActual) {
    if (!participantParsed?.groups || !currentActual?.groups) return 0;
    let score = 0;

    const cleanText = (str) => String(str || "").trim().toLowerCase();
    const cleanGroupKey = (key) => {
        const cleaned = String(key || "").trim().toUpperCase();
        if (cleaned.startsWith("GRUPPE ")) return cleaned.replace("GRUPPE ", "");
        return cleaned;
    };

    const userGroupsCleaned = {};
    Object.entries(participantParsed.groups).forEach(([key, value]) => {
        userGroupsCleaned[cleanGroupKey(key)] = value;
    });

    for (const [groupLetter, actualRows] of Object.entries(currentActual.groups)) {
        const cleanLetter = cleanGroupKey(groupLetter);
        const userOrder = userGroupsCleaned[cleanLetter] || [];
        
        const hasPlayedMatches = actualRows.some(row => Number(row?.p || 0) > 0);
        if (!hasPlayedMatches) continue;
        
        actualRows.forEach((actualRow, idx) => {
            const actualTeam = actualRow?.team || "";
            const userTeam = userOrder[idx];
            
            if (cleanText(userTeam) === cleanText(actualTeam) && cleanText(actualTeam) !== "") {
                score += 1; 
                if (idx === 0) {
                    score += 2; 
                }
            }
        });
    }
    return score;
}

function pointsPart2(row, actual) { 
    const part2 = safeJsonParse(row.part2Json || row.part2, {}); 
    let points = 0; 
    const actualPart2 = actual.part2 || {}; 

    const questionFields = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10_brazil", "q10_haiti"]; 
    questionFields.forEach((field) => { 
        if (matchesActual(part2?.[field], actualPart2?.[field])) points += 2; 
    }); 

    ["m1", "m2", "m3"].forEach((field) => { 
        if (matchesActual(part2?.[field], actualPart2?.[field])) points += 2; 
    }); 
    return points; 
} 

function pointsPart3(row, actual) { 
    const part3 = safeJsonParse(row.part3Json || row.part3, null); 
    if (!part3 || !actual.knockout) return 0; 
    let points = 0; 

    const cleanText = (str) => String(str || "").trim().toLowerCase();

    const predictedRoundOf32 = Array.isArray(part3.roundOf32) ? part3.roundOf32.map(cleanText).filter(Boolean) : []; 
    const predictedRoundOf16 = Array.isArray(part3.roundOf16) ? part3.roundOf16.map(cleanText).filter(Boolean) : []; 
    const predictedQuarterfinals = Array.isArray(part3.quarterfinals) ? part3.quarterfinals.map(cleanText).filter(Boolean) : []; 

    const actualRoundOf32 = Array.isArray(actual.knockout.r32) ? actual.knockout.r32.map(cleanText).filter(Boolean) : []; 
    const actualRoundOf16 = Array.isArray(actual.knockout.r16) ? actual.knockout.r16.map(cleanText).filter(Boolean) : []; 
    const actualQuarterfinals = Array.isArray(actual.knockout.qf) ? actual.knockout.qf.map(cleanText).filter(Boolean) : []; 

    predictedRoundOf32.forEach(t => { if (actualRoundOf32.includes(t)) points += 1; }); 
    predictedRoundOf16.forEach(t => { if (actualRoundOf16.includes(t)) points += 2; }); 
    predictedQuarterfinals.forEach(t => { if (actualQuarterfinals.includes(t)) points += 3; }); 

    return points; 
} 

export default function LeaderboardPage() { 
    const [data, setData] = useState([]); 
    const [loading, setLoading] = useState(true); 
    const [adminVisible, setAdminVisible] = useState(false); 
    const [adminPassword, setAdminPassword] = useState(""); 
    const [adminMessage, setAdminMessage] = useState(""); 
    const [adminAuthenticated, setAdminAuthenticated] = useState(false); 
    const [serverActual, setServerActual] = useState(null); 
    const [actual, setActual] = useState({ groups: {}, part2: {}, knockout: {} }); 
    const [part2Actual, setPart2Actual] = useState({}); 

    async function loadLeaderboardData() { 
        setLoading(true); 
        try { 
            const [submissionsRes, actualsRes, liveData] = await Promise.all([ 
                fetch(`${API_BASE}?action=all`), 
                getActuals().catch(() => ({ ok: false, data: null })),
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

            setActual({
                groups: liveData.groups || {},
                part2: srv?.part2 || {},
                knockout: liveData.knockout || {}
            });

            setPart2Actual(srv?.part2 || {}); 
        } catch (error) { 
            console.error("Feil ved lasting av data:", error);
            setData([]); 
        } finally { 
            setLoading(false); 
        } 
    } 

    useEffect(() => { 
        loadLeaderboardData(); 
    }, []); 

    function updatePart2Field(field, value) { 
        setPart2Actual((prev) => ({ ...prev, [field]: value })); 
    } 

    async function handleSaveActual() { 
        setAdminMessage(""); 
        try { 
            const res = await saveActual({ 
                password: adminPassword, 
                data: { ...(serverActual || {}), part2: part2Actual } 
            }); 

            if (res?.ok) { 
                setAdminMessage("Fasit lagret på server"); 
                const nextServerActual = { ...(serverActual || {}), part2: part2Actual }; 
                setServerActual(nextServerActual); 
                setActual(prev => ({ ...prev, part2: part2Actual })); 
            } else { 
                setAdminMessage("Kunne ikke lagre fasit. Sjekk passordet."); 
            } 
        } catch { 
            setAdminMessage("Feil ved lagring av fasit (nettverksfeil)."); 
        } 
    } 

    const sortedData = useMemo(() => { 
        return [...data].map(row => {
            const parsedPart1 = safeJsonParse(row.part1Json || row.part1, { groups: {} });
            
            const p1 = pointsPart1(parsedPart1, actual); 
            const p2 = pointsPart2(row, actual); 
            const p3 = pointsPart3(row, actual); 
            const total = p1 + p2 + p3; 

            return { ...row, p1, p2, p3, total };
        }).sort((a, b) => b.total - a.total); 
    }, [data, actual]); 

    if (loading) { 
        return <div style={{ padding: 20, textAlign: "center", fontFamily: "sans-serif" }}>Oppdaterer ledertavle med live-resultater...</div>; 
    } 

    return ( 
        <div style={{ padding: 20, maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}> 
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "24px" }}>Poengtavle</h1> 
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        Del 1 og 3 oppdateres live. Del 2 settes av admin.
                    </div>
                </div>
                <button onClick={loadLeaderboardData} style={{ padding: "6px 12px", cursor: "pointer" }}>
                    Oppdater live
                </button>
            </div>

            <div style={{ marginBottom: 12 }}> 
                <button onClick={() => setAdminVisible((v) => !v)} style={{ padding: "6px 12px", marginRight: 8 }}> 
                    {adminVisible ? "Skjul admin" : "Admin: Endre fasit del 2"} 
                </button> 
            </div> 

            {adminVisible && ( 
                <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, backgroundColor: "#f9fafb" }}> 
                    {!adminAuthenticated ? ( 
                        <div> 
                            <div style={{ marginBottom: 8, fontWeight: "bold" }}>Admin-passord:</div> 
                            <input 
                                type="password" 
                                value={adminPassword} 
                                onChange={(e) => setAdminPassword(e.target.value)} 
                                style={{ padding: 8, marginBottom: 8, display: "block", borderRadius: 4, border: "1px solid #ccc" }} 
                            /> 
                            <button onClick={() => setAdminAuthenticated(true)} disabled={!adminPassword} style={{ padding: "6px 12px" }}> 
                                Logg inn 
                            </button> 
                        </div> 
                    ) : ( 
                        <div> 
                            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}> 
                                <span style={{ fontWeight: "bold", color: "#16a34a" }}>Innlogget som admin</span> 
                                <button onClick={() => { setAdminAuthenticated(false); setAdminPassword(""); }} style={{ padding: "4px 8px" }}>Logg ut</button> 
                            </div> 

                            <h3 style={{ marginTop: 0 }}>Fasit del 2</h3> 
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}> 
                                <label>
                                    <div style={{ fontSize: 12, fontWeight: "bold" }}>Toppscorer (q1)</div>
                                    <select value={part2Actual.q1 || ""} onChange={(e) => updatePart2Field("q1", e.target.value)} style={{ width: "100%", padding: 6 }}>
                                        <option value="">Velg</option>
                                        {SCORERS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </label>

                                <label>
                                    <div style={{ fontSize: 12, fontWeight: "bold" }}>Mestscorende lag (q3)</div>
                                    <select value={part2Actual.q3 || ""} onChange={(e) => updatePart2Field("q3", e.target.value)} style={{ width: "100%", padding: 6 }}>
                                        <option value="">Velg</option>
                                        {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </label>
                                
                                {/* Du kan fylle på med de andre inputfeltene her om ønskelig */}
                            </div> 

                            <div style={{ marginTop: 16 }}> 
                                <button onClick={handleSaveActual} style={{ padding: "8px 16px", fontWeight: "bold" }}> 
                                    Lagre fasit på server 
                                </button> 
                            </div> 
                            {adminMessage && <div style={{ marginTop: 8, fontWeight: "bold", color: "#16a34a" }}>{adminMessage}</div>} 
                        </div> 
                    )} 
                </div> 
            )} 

            {/* Rangeringstabell */}
            <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 10 }}> 
                <thead> 
                    <tr> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 40, backgroundColor: "#eaeaea" }}>Plass</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, backgroundColor: "#eaeaea", textAlign: "left" }}>Navn</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 60, backgroundColor: "#eaeaea" }}>Del 1</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 60, backgroundColor: "#eaeaea" }}>Del 2</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 60, backgroundColor: "#eaeaea" }}>Del 3</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 80, backgroundColor: "#eaeaea", fontWeight: "bold" }}>Total</th> 
                    </tr> 
                </thead> 
                <tbody> 
                    {sortedData.map((player, index) => ( 
                        <tr key={player.id || index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" }}> 
                            <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center", fontWeight: "bold" }}>{index + 1}</td> 
                            <td style={{ border: "1px solid #ccc", padding: 8 }}>{player.name || "Ukjent"}</td> 
                            <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{player.p1} p</td> 
                            <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{player.p2} p</td> 
                            <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{player.p3} p</td> 
                            <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center", fontWeight: "bold", backgroundColor: "#f0fdf4" }}>{player.total} p</td> 
                        </tr> 
                    ))} 
                </tbody> 
            </table> 
        </div> 
    ); 
}