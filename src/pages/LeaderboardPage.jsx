import React, { useState, useEffect, useMemo } from "react";
import { getActuals, saveActual } from "../lib/api"; 
import { API_BASE } from "../config"; 

// Eksterne API-er for live-data
const STANDINGS_URL = "https://sportscore.com/api/widget/standings/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";
const BRACKET_URL = "https://sportscore.com/api/widget/bracket/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";

const USE_PROXY = true;

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

async function fetchLiveDataFromProxy() {
    // console.log("DEBUG fetchLiveDataFromProxy CALLED");

    try {
        const [standingsRes, bracketRes] = await Promise.all([
            fetch(`${API_BASE}?action=liveParsed`),
            fetch(`${API_BASE}?action=liveBracketParsed`)
        ]);

        // console.log("DEBUG standingsRes.ok:", standingsRes.ok);
        // console.log("DEBUG bracketRes.ok:", bracketRes.ok);

        if (!standingsRes.ok) {
            throw new Error(`Proxy standings-feil: ${standingsRes.status}`);
        }
        if (!bracketRes.ok) {
            throw new Error(`Proxy bracket-feil: ${bracketRes.status}`);
        }

        const standingsRaw = await standingsRes.json();
        const bracketRaw = await bracketRes.json();

        // console.log("DEBUG standingsRaw:", standingsRaw);
        // console.log("DEBUG bracketRaw:", bracketRaw);

        const standings = standingsRaw?.data;
        const bracket = bracketRaw?.data;

        // console.log("DEBUG extracted standings:", standings);
        // console.log("DEBUG extracted bracket:", bracket);

        if (!standings || !bracket) {
            // console.log("DEBUG ERROR: standings or bracket missing data field");
            throw new Error("Proxy-data mangler 'data'-felt");
        }

        const result = {
            groups: standings.groups || {},
            knockout: bracket.knockout || {}
        };

        // console.log("DEBUG fetchLiveDataFromProxy RETURN:", result);

        return result;

    } catch (err) {
        console.error("Feil ved henting av proxy-live-data:", err);
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
    // console.log("DEBUG pointsPart1 currentActual.groups:", currentActual.groups);

    if (!participantParsed?.groups || !currentActual?.groups) return 0;
    let score = 0;

    const cleanText = (str) => {
        const s = String(str || "").trim().toLowerCase();
        if (s.includes("winner")) return ""; // ignorer ikke-ferdige kamper
        return s;
    };
    
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

    // Del 2 – vanlige spørsmål (2 poeng hver)
    const questionFields = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"]; 
    questionFields.forEach((field) => { 
        if (matchesActual(part2?.[field], actualPart2?.[field])) points += 2; 
    }); 

    // q10 – Brasil vs Haiti (2 poeng totalt, ikke 4)
    const userBrazil = Number(part2?.q10_brazil ?? null);
    const userHaiti = Number(part2?.q10_haiti ?? null);

    const actualBrazil = Number(actualPart2?.q10_brazil ?? null);
    const actualHaiti = Number(actualPart2?.q10_haiti ?? null);

    if (userBrazil === actualBrazil && userHaiti === actualHaiti) {
        points += 2; // riktig totalpoeng for q10
    }

    // m1, m2, m3 – 2 poeng hver
    ["m1", "m2", "m3"].forEach((field) => { 
        if (matchesActual(part2?.[field], actualPart2?.[field])) points += 2; 
    }); 

    return points; 
}

function pointsPart3(row, actual) {
    const part3 = safeJsonParse(row.part3Json || row.part3, null); 
    if (!part3 || !actual.knockout) return 0; 

    let points = 0; 

    const cleanText = (str) => {
        return String(str || "")
            .toLowerCase()
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    };

    // -----------------------------
    // BRUKERENS TIPS
    // -----------------------------
    const r16_pred = (part3.roundOf32 || []).map(cleanText).filter(Boolean);      // lag i 8-dels
    const qf_pred  = (part3.roundOf16 || []).map(cleanText).filter(Boolean);      // lag i kvart
    const sf_pred  = (part3.quarterfinals || []).map(cleanText).filter(Boolean);  // lag i semi
    const f_pred   = (part3.semifinals || []).map(cleanText).filter(Boolean);     // lag i finale
    const winner_pred = cleanText(part3.final?.[0]);
    const bronze_pred = cleanText(part3.bronze?.[0]);

    // -----------------------------
    // FASIT
    // -----------------------------
    const r16_actual = (actual.knockout.r16 || []).map(cleanText).filter(t => t && !t.includes("winner"));
    const qf_actual  = (actual.knockout.qf || []).map(cleanText).filter(t => t && !t.includes("winner"));
    const sf_actual  = (actual.knockout.sf || []).map(cleanText).filter(t => t && !t.includes("winner"));
    const f_actual   = (actual.knockout.f || []).map(cleanText).filter(t => t && !t.includes("winner"));

    const r16_set = new Set(r16_actual);
    const qf_set  = new Set(qf_actual);
    const sf_set  = new Set(sf_actual);
    const f_set   = new Set(f_actual);

    // -----------------------------
    // 8-DEL (+2)
    // lag i 8-dels
    // -----------------------------
    r16_pred.forEach(t => {
        if (r16_set.has(t)) points += 2;
    });

    // -----------------------------
    // KVARTFINAL (+3)
    // lag i kvartfinale
    // -----------------------------
    qf_pred.forEach(t => {
        if (qf_set.has(t)) points += 3;
    });

    // -----------------------------
    // SEMIFINAL (+4)
    // lag i semifinale
    // -----------------------------
    sf_pred.forEach(t => {
        if (sf_set.has(t)) points += 4;
    });

    // -----------------------------
    // FINALE (lag i finalen)
    // -----------------------------
    if (f_actual.length > 0) {
        f_pred.forEach(t => {
            if (f_set.has(t)) {
                points += 5; // finalist
            }
        });
    }

    // -----------------------------
    // FINALE + VINNER (KORREKT LOGIKK)
    // -----------------------------
    if (
        actual.knockout.winner &&
        actual.knockout.runnerUp &&
        f_pred.length === 2
    ) {
        const actualWinner = cleanText(actual.knockout.winner);
        const actualRunnerUp = cleanText(actual.knockout.runnerUp);
    
        const predWinner = winner_pred;
        const predRunnerUp = f_pred.find(t => t !== predWinner);
    
        const hasCorrectWinner = predWinner === actualWinner;
        const hasCorrectRunnerUp = f_pred.includes(actualRunnerUp);
    
        // ✅ RIKTIG BEGGE
        if (hasCorrectWinner && hasCorrectRunnerUp) {
            points += 15; // 10 + 5
        }
    
        // ✅ RIKTIGE MEN BYTTET
        else if (
            f_pred.includes(actualWinner) &&
            f_pred.includes(actualRunnerUp)
        ) {
            points += 8;
        }
    
        // ✅ KUN RIKTIG VINNER
        else if (hasCorrectWinner) {
            points += 10;
        }
    
        // ✅ KUN RIKTIG TAPER
        else if (hasCorrectRunnerUp) {
            points += 5;
        }
    }

    // -----------------------------
    // BRONSE (+3)
    // -----------------------------
    if (actual.knockout.bronze) {
        const bronze_actual = cleanText(actual.knockout.bronze);
        if (bronze_pred === bronze_actual) {
            points += 3;
        }
    }

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
                // USE_PROXY ? fetchLiveDataFromProxy() : fetchExternalLiveData()
                await fetchLiveDataFromProxy()
            ]);
    
            // SUBMISSIONS
            const submissionsJson = await submissionsRes.json(); 
            if (submissionsJson?.ok && Array.isArray(submissionsJson.data)) { 
                setData(submissionsJson.data); 
            } else if (Array.isArray(submissionsJson)) {
                setData(submissionsJson);
            } else { 
                setData([]); 
            } 
    
            // FASIT (del 2)
            const srv = actualsRes?.ok && actualsRes?.data ? actualsRes.data : null; 
            setServerActual(srv); 
    
            // LIVE (del 1 + del 3) – kommer nå fra proxy / external
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

    // Hjelpefunksjon for å håndtere avkryssing av flere svar (arrays)
    function handleCheckboxChange(field, optionValue) {
        const currentValues = Array.isArray(part2Actual[field]) ? part2Actual[field] : [];
        if (currentValues.includes(optionValue)) {
            updatePart2Field(field, currentValues.filter(v => v !== optionValue));
        } else {
            updatePart2Field(field, [...currentValues, optionValue]);
        }
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
            // console.log("DEBUG parsedPart1 for", row.name, parsedPart1);

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

                            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Fasit del 2</h3> 
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}> 
                                
                                {/* q1 - FLERE SVAR */}
                                <div style={{ display: "block", border: "1px solid #ddd", padding: 8, borderRadius: 4, backgroundColor: "#fff" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Toppscorer (q1) - Velg én eller flere</div>
                                    <div style={{ maxHeight: "110px", overflowY: "auto", border: "1px solid #eee", padding: 4 }}>
                                        {SCORERS.map(v => (
                                            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 2, cursor: "pointer" }}>
                                                <input type="checkbox" checked={(part2Actual.q1 || []).includes(v)} onChange={() => handleCheckboxChange("q1", v)} />
                                                {v}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <label style={{ display: "block" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Antall mål for toppscorer (q2)</div>
                                    <input type="number" min={0} value={part2Actual.q2 || ""} onChange={(e) => updatePart2Field("q2", e.target.value)} style={{ width: "100%", padding: 5, boxSizing: "border-box" }} />
                                </label>

                                {/* q3 - FLERE SVAR */}
                                <div style={{ display: "block", border: "1px solid #ddd", padding: 8, borderRadius: 4, backgroundColor: "#fff" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Mestscorende lag (q3) - Velg én eller flere</div>
                                    <div style={{ maxHeight: "110px", overflowY: "auto", border: "1px solid #eee", padding: 4 }}>
                                        {TEAMS.map(v => (
                                            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 2, cursor: "pointer" }}>
                                                <input type="checkbox" checked={(part2Actual.q3 || []).includes(v)} onChange={() => handleCheckboxChange("q3", v)} />
                                                {v}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* q4 - FLERE SVAR */}
                                <div style={{ display: "block", border: "1px solid #ddd", padding: 8, borderRadius: 4, backgroundColor: "#fff" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Flest mål imot (q4) - Velg én eller flere</div>
                                    <div style={{ maxHeight: "110px", overflowY: "auto", border: "1px solid #eee", padding: 4 }}>
                                        {TEAMS.map(v => (
                                            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 2, cursor: "pointer" }}>
                                                <input type="checkbox" checked={(part2Actual.q4 || []).includes(v)} onChange={() => handleCheckboxChange("q4", v)} />
                                                {v}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <label style={{ display: "block" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Antall mål i finalen (q5)</div>
                                    <input type="number" min={0} value={part2Actual.q5 || ""} onChange={(e) => updatePart2Field("q5", e.target.value)} style={{ width: "100%", padding: 5, boxSizing: "border-box" }} />
                                </label>

                                <label style={{ display: "block" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Totalt antall mål i VM (q6)</div>
                                    <select value={part2Actual.q6 || ""} onChange={(e) => updatePart2Field("q6", e.target.value)} style={{ width: "100%", padding: 6 }}>
                                        <option value="">Velg</option>
                                        {TOTAL_GOALS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </label>

                                <label style={{ display: "block" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Hvem gjør det best, GER el. FRA? (q7)</div>
                                    <select value={part2Actual.q7 || ""} onChange={(e) => updatePart2Field("q7", e.target.value)} style={{ width: "100%", padding: 6 }}>
                                        <option value="">Velg</option>
                                        <option value="Tyskland">Tyskland</option>
                                        <option value="Frankrike">Frankrike</option>
                                    </select>
                                </label>

                                {/* q8 - FLERE SVAR */}
                                <div style={{ display: "block", border: "1px solid #ddd", padding: 8, borderRadius: 4, backgroundColor: "#fff" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Flest gule kort (q8) - Velg én eller flere</div>
                                    <div style={{ maxHeight: "110px", overflowY: "auto", border: "1px solid #eee", padding: 4 }}>
                                        {TEAMS.map(v => (
                                            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 2, cursor: "pointer" }}>
                                                <input type="checkbox" checked={(part2Actual.q8 || []).includes(v)} onChange={() => handleCheckboxChange("q8", v)} />
                                                {v}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* q9 - FLERE SVAR */}
                                <div style={{ display: "block", border: "1px solid #ddd", padding: 8, borderRadius: 4, backgroundColor: "#fff" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Første røde kort (q9) - Velg én eller flere</div>
                                    <div style={{ maxHeight: "110px", overflowY: "auto", border: "1px solid #eee", padding: 4 }}>
                                        {TEAMS.map(v => (
                                            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 2, cursor: "pointer" }}>
                                                <input type="checkbox" checked={(part2Actual.q9 || []).includes(v)} onChange={() => handleCheckboxChange("q9", v)} />
                                                {v}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <label style={{ display: "block" }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>Resultat Brasil - Haiti (q10)</div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        <input type="number" placeholder="BRA" min={0} value={part2Actual.q10_brazil || ""} onChange={(e) => updatePart2Field("q10_brazil", e.target.value)} style={{ width: "100%", padding: 5, boxSizing: "border-box" }} />
                                        <span>-</span>
                                        <input type="number" placeholder="HAI" min={0} value={part2Actual.q10_haiti || ""} onChange={(e) => updatePart2Field("q10_haiti", e.target.value)} style={{ width: "100%", padding: 5, boxSizing: "border-box" }} />
                                    </div>
                                </label>

                                {/* Kamper seksjon */}
                                <div style={{ gridColumn: "1 / -1", marginTop: 8, padding: 10, border: "1px solid #ddd", borderRadius: 6, backgroundColor: "#fff" }}>
                                    <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#374151" }}>Kampresultater (m1, m2, m3)</div>
                                    {[
                                        { key: "m1", label: "Kroatia - England" },
                                        { key: "m2", label: "Tyskland - Elfenbenskysten" },
                                        { key: "m3", label: "Uruguay - Spania" }
                                    ].map((m) => (
                                        <div key={m.key} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: "1px dashed #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ fontSize: 13, fontWeight: "500" }}>{m.label}</div>
                                            <div style={{ display: "flex", gap: 14 }}>
                                                {HUB_OPTIONS.map((opt) => (
                                                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
                                                        <input type="radio" name={m.key} checked={part2Actual[m.key] === opt} onChange={() => updatePart2Field(m.key, opt)} />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div> 

                            <div style={{ marginTop: 16 }}> 
                                <button onClick={handleSaveActual} style={{ padding: "8px 16px", fontWeight: "bold", cursor: "pointer" }}> 
                                    Lagre fasit på server 
                                </button> 
                            </div> 
                            {adminMessage && <div style={{ marginTop: 8, fontWeight: "bold", color: "#16a34a" }}>{adminMessage}</div>} 
                        </div> 
                    )} 
                </div> 
            )} 

            {/* Rangeringstabell */}
            <div className="leaderboard-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Plass</th>
                    <th>Navn</th>
                    <th>Del 1</th>
                    <th>Del 2</th>
                    <th>Del 3</th>
                    <th>Total</th>
                  </tr>
                </thead>
            
                <tbody>
                  {sortedData.map((player, index) => (
                    <tr key={player.id || index}>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>{index + 1}</td>
                      <td>{player.name || "Ukjent"}</td>
                      <td style={{ textAlign: "center" }}>{player.p1} p</td>
                      <td style={{ textAlign: "center" }}>{player.p2} p</td>
                      <td style={{ textAlign: "center" }}>{player.p3} p</td>
                      <td className="total" style={{ textAlign: "center" }}>{player.total} p</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div> 
    ); 
}
