import { useEffect, useMemo, useState } from "react"; 
import { getActuals, saveActual } from "../lib/api"; 
import { API_BASE } from "../config"; 

const ACTUAL = { 
    groups: { 
        A: [], B: [], C: [], D: [], E: [], F: [], 
        G: [], H: [], I: [], J: [], K: [], L: [] 
    }, 
    part2: { 
        q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", 
        q7: "", q8: "", q9: "", q10_brazil: "", q10_haiti: "", 
        m1: "", m2: "", m3: "" 
    }, 
    knockout: { 
        roundOf32: [], roundOf16: [], quarterfinals: [], semifinals: [], 
        champion: "", runnerUp: "", bronze: "", fourth: "" 
    } 
}; 

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

function safeJsonParse(value, fallback = null) { 
    if (!value) return fallback; 
    try { return JSON.parse(value); } catch { return fallback; } 
} 

function normalizeTeam(value) { return String(value || "").trim(); } 
function normalizeAnswer(value) { return String(value ?? "").trim(); } 

function matchesActual(predicted, actual) { 
    const normalizedPredicted = normalizeAnswer(predicted); 
    if (!normalizedPredicted) return false; 
    if (Array.isArray(actual)) { 
        return actual.map(normalizeAnswer).includes(normalizedPredicted); 
    } 
    return normalizedPredicted === normalizeAnswer(actual); 
} 

function readLocalActual() { 
    if (typeof window === "undefined") return { storedPart2: {}, storedLive: {} }; 
    const storedPart2 = safeJsonParse(localStorage.getItem("actual_part2"), {}) || {}; 
    const storedLive = safeJsonParse(localStorage.getItem("actual_live"), {}) || {}; 
    return { storedPart2, storedLive }; 
} 

function buildActual(serverActual = null) { 
    const { storedPart2, storedLive } = readLocalActual(); 
    return { 
        // Vi må sørge for at serverActual (som inneholder live-data fra getActuals()) 
        // eller storedLive (lokal live-kilde) har prioritet over de tomme malene.
        groups: { ...(ACTUAL.groups || {}), ...(serverActual?.groups || {}), ...(storedLive?.groups || {}) }, 
        part2: { ...(ACTUAL.part2 || {}), ...(storedPart2 || {}), ...(serverActual?.part2 || {}), ...(storedLive?.part2 || {}) }, 
        knockout: { ...(ACTUAL.knockout || {}), ...(serverActual?.knockout || {}), ...(storedLive?.knockout || {}) } 
    }; 
}

function pointsPart1(row, actual) { 
    const part1 = safeJsonParse(row.part1Json, { groups: {} }); 
    const predictedGroups = part1?.groups || {}; 
    let points = 0; 

    for (const [group, actualOrderRaw] of Object.entries(actual.groups || {})) { 
        const actualOrder = Array.isArray(actualOrderRaw) ? actualOrderRaw.map(normalizeTeam) : []; 
        const predictedOrder = Array.isArray(predictedGroups[group]) ? predictedGroups[group].map(normalizeTeam) : []; 

        for (let i = 0; i < 4; i++) { 
            if (predictedOrder[i] && predictedOrder[i] === actualOrder[i]) points += 1; 
        } 
        if (predictedOrder[0] && actualOrder[0] && predictedOrder[0] === actualOrder[0]) points += 2; 
    } 
    return points; 
} 

function pointsPart2(row, actual) { 
    const part2 = safeJsonParse(row.part2Json, {}); 
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
    const part3 = safeJsonParse(row.part3Json, null); 
    if (!part3) return 0; 
    let points = 0; 

    const predictedRoundOf32 = Array.isArray(part3.roundOf32) ? part3.roundOf32.map(normalizeTeam).filter(Boolean) : []; 
    const predictedRoundOf16 = Array.isArray(part3.roundOf16) ? part3.roundOf16.map(normalizeTeam).filter(Boolean) : []; 
    const predictedQuarterfinals = Array.isArray(part3.quarterfinals) ? part3.quarterfinals.map(normalizeTeam).filter(Boolean) : []; 

    const actualRoundOf32 = Array.isArray(actual.knockout?.roundOf32) ? actual.knockout.roundOf32.map(normalizeTeam).filter(Boolean) : []; 
    const actualRoundOf16 = Array.isArray(actual.knockout?.roundOf16) ? actual.knockout.roundOf16.map(normalizeTeam).filter(Boolean) : []; 
    const actualQuarterfinals = Array.isArray(actual.knockout?.quarterfinals) ? actual.knockout.quarterfinals.map(normalizeTeam).filter(Boolean) : []; 

    predictedRoundOf32.forEach(t => { if (actualRoundOf32.includes(t)) points += 1; }); 
    predictedRoundOf16.forEach(t => { if (actualRoundOf16.includes(t)) points += 2; }); 
    predictedQuarterfinals.forEach(t => { if (actualQuarterfinals.includes(t)) points += 3; }); 

    const getPredictedChampion = p => normalizeTeam(p?.final?.[0]); 
    const getPredictedFinalists = p => Array.isArray(p?.semifinals) ? p.semifinals.map(normalizeTeam).filter(Boolean) : []; 
    const getPredictedRunnerUp = p => { 
        const f = getPredictedFinalists(p); 
        const c = getPredictedChampion(p); 
        return f.find(t => t && t !== c) || ""; 
    }; 
    const getPredictedSemifinalists = p => Array.isArray(p?.quarterfinals) ? p.quarterfinals.map(normalizeTeam).filter(Boolean) : []; 
    const getPredictedBronzeMatchTeams = p => { 
        const s = getPredictedSemifinalists(p); 
        const f = getPredictedFinalists(p); 
        return s.filter(t => t && !f.includes(t)); 
    }; 
    const getPredictedBronzeWinner = p => normalizeTeam(p?.bronze?.[0]); 
    const getPredictedFourth = p => { 
        const b = getPredictedBronzeMatchTeams(p); 
        const w = getPredictedBronzeWinner(p); 
        return b.find(t => t && t !== w) || ""; 
    }; 

    const pChamp = getPredictedChampion(part3); 
    const pRunner = getPredictedRunnerUp(part3); 
    const pBronze = getPredictedBronzeWinner(part3); 
    const pFourth = getPredictedFourth(part3); 

    const aChamp = normalizeTeam(actual.knockout?.champion); 
    const aRunner = normalizeTeam(actual.knockout?.runnerUp); 
    const aBronze = normalizeTeam(actual.knockout?.bronze); 
    const aFourth = normalizeTeam(actual.knockout?.fourth); 

    if (pChamp && aChamp && pChamp === aChamp) points += 10; 
    if (pRunner && aRunner && pRunner === aRunner) points += 5; 
    if (pChamp && pRunner && aChamp && aRunner && pChamp === aRunner && pRunner === aChamp) points += 8; 
    if (pBronze && aBronze && pBronze === aBronze) points += 3; 
    if (pFourth && aFourth && pFourth === aFourth) points += 3; 

    return points; 
} 

function calculatePoints(row, actual) { 
    return pointsPart1(row, actual) + pointsPart2(row, actual) + pointsPart3(row, actual); 
} 

export default function LeaderboardPage() { 
    const [data, setData] = useState([]); 
    const [loading, setLoading] = useState(true); 
    const [adminVisible, setAdminVisible] = useState(false); 
    const [adminPassword, setAdminPassword] = useState(""); 
    const [adminMessage, setAdminMessage] = useState(""); 
    const [adminAuthenticated, setAdminAuthenticated] = useState(false); 
    const [serverActual, setServerActual] = useState(null); 
    const [actual, setActual] = useState(() => buildActual(null)); 
    const [part2Actual, setPart2Actual] = useState({ ...(ACTUAL.part2 || {}) }); 

    async function loadLeaderboardData() { 
        setLoading(true); 
        try { 
            const [submissionsRes, actualsRes] = await Promise.all([ 
                fetch(`${API_BASE}?action=all`), 
                getActuals() 
            ]); 

            const submissionsJson = await submissionsRes.json(); 
            if (submissionsJson?.ok) { 
                setData(Array.isArray(submissionsJson.data) ? submissionsJson.data : []); 
            } else { 
                setData([]); 
            } 

            const srv = actualsRes?.ok && actualsRes?.data ? actualsRes.data : null; 
            setServerActual(srv); 
            setActual(buildActual(srv)); 

            if (srv?.part2) { 
                setPart2Actual({ ...(ACTUAL.part2 || {}), ...(srv.part2 || {}) }); 
            } else { 
                setPart2Actual({ ...(ACTUAL.part2 || {}) }); 
            } 
        } catch { 
            setData([]); 
            setServerActual(null); 
            setActual(buildActual(null)); 
            setPart2Actual({ ...(ACTUAL.part2 || {}) }); 
        } finally { 
            setLoading(false); 
        } 
    } 

    useEffect(() => { 
        loadLeaderboardData(); 
    }, []); 

    useEffect(() => { 
        function refreshFromStorage() { setActual(buildActual(serverActual)); } 
        function handleVisibilityChange() { if (document.visibilityState === "visible") refreshFromStorage(); } 

        window.addEventListener("focus", refreshFromStorage); 
        window.addEventListener("storage", refreshFromStorage); 
        document.addEventListener("visibilitychange", handleVisibilityChange); 

        return () => { 
            window.removeEventListener("focus", refreshFromStorage); 
            window.removeEventListener("storage", refreshFromStorage); 
            document.removeEventListener("visibilitychange", handleVisibilityChange); 
        }; 
    }, [serverActual]); 

    useEffect(() => { 
        if (!adminAuthenticated) return; 
        let mounted = true; 
        (async () => { 
            try { 
                const res = await getActuals(); 
                if (mounted && res?.ok && res?.data) { 
                    const srv = res.data || {}; 
                    setServerActual(srv); 
                    setActual(buildActual(srv)); 
                    setPart2Actual({ ...(ACTUAL.part2 || {}), ...(srv.part2 || {}) }); 
                } 
            } catch { /* ignore */ } 
        })(); 
        return () => { mounted = false; }; 
    }, [adminAuthenticated]); 

    function updatePart2Field(field, value) { 
        setPart2Actual((prev) => ({ ...prev, [field]: value })); 
    } 

    function isPart2Empty(obj) { 
        return Object.values(obj || {}).every((v) => v === "" || v === null || typeof v === "undefined"); 
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
                setActual(buildActual(nextServerActual)); 
            } else { 
                const msg = res && (res.error || res.raw || (res.data && JSON.stringify(res.data))) 
                    ? res.error || res.raw || JSON.stringify(res.data) : null; 
                setAdminMessage(msg ? `Feil ved lagring: ${msg}` : `Kunne ikke lagre fasit (status ${res?.status ?? "n/a"})`); 
            } 
        } catch { 
            setAdminMessage("Feil ved lagring av fasit (nettverksfeil)."); 
        } 
    } 

    const sortedData = useMemo(() => { 
        const getPredictedChampion = p => normalizeTeam(p?.final?.[0]); 
        const getPredictedFinalists = p => Array.isArray(p?.semifinals) ? p.semifinals.map(normalizeTeam).filter(Boolean) : []; 
        const getPredictedRunnerUp = p => { 
            const f = getPredictedFinalists(p); 
            const c = getPredictedChampion(p); 
            return f.find(t => t && t !== c) || ""; 
        }; 

        return [...data].sort((a, b) => { 
            const totalDiff = calculatePoints(b, actual) - calculatePoints(a, actual); 
            if (totalDiff !== 0) return totalDiff; 

            const p3A = safeJsonParse(a.part3Json, null); 
            const p3B = safeJsonParse(b.part3Json, null); 
            const aChamp = normalizeTeam(actual.knockout?.champion); 
            const aRunner = normalizeTeam(actual.knockout?.runnerUp); 

            const champDiff = Number(getPredictedChampion(p3B) === aChamp) - Number(getPredictedChampion(p3A) === aChamp); 
            if (champDiff !== 0) return champDiff; 

            const runnerDiff = Number(getPredictedRunnerUp(p3B) === aRunner) - Number(getPredictedRunnerUp(p3A) === aRunner); 
            if (runnerDiff !== 0) return runnerDiff; 

            return String(a.name || "").localeCompare(String(b.name || ""), "nb"); 
        }); 
    }, [data, actual]); 

    if (loading) { 
        return <div style={{ padding: 20 }}>Laster...</div>; 
    } 

    return ( 
        <div style={{ padding: 20, fontFamily: "sans-serif" }}> 
            <h1>Poeng</h1> 

            <div style={{ marginBottom: 12 }}> 
                <button onClick={() => setAdminVisible((v) => !v)} style={{ marginRight: 8, padding: "6px 12px" }}> 
                    {adminVisible ? "Skjul admin" : "Admin: Endre fasit"} 
                </button> 

                {adminVisible && ( 
                    <span style={{ color: "#6b7280", fontSize: 14 }}> 
                        Kun synlig for administratorer som kjenner passordet. 
                    </span> 
                )} 

                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}> 
                    Merk: Poeng beregnes med server-fasit for Del 2 og live-data for Del 1/Del 3. 
                </div> 
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
                            <div> 
                                <button 
                                    onClick={() => { 
                                        if (adminPassword && adminPassword.length > 0) { 
                                            setAdminAuthenticated(true); 
                                            setAdminMessage("Innlogget som admin (server valideres ved lagring)"); 
                                        } else { 
                                            setAdminMessage("Skriv inn passord"); 
                                        } 
                                    }} 
                                    disabled={!adminPassword} 
                                    style={{ padding: "6px 12px" }}
                                > 
                                    Logg inn 
                                </button> 
                            </div> 
                            {adminMessage && <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 14 }}>{adminMessage}</div>} 
                        </div> 
                    ) : ( 
                        <div> 
                            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}> 
                                <span style={{ fontWeight: "bold", color: "#16a34a" }}>Innlogget som admin</span> 
                                <button 
                                    onClick={() => { 
                                        setAdminAuthenticated(false); 
                                        setAdminPassword(""); 
                                        setAdminMessage(""); 
                                    }} 
                                    style={{ padding: "4px 8px" }}
                                > 
                                    Logg ut 
                                </button> 
                            </div> 

                            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Fasit del 2</h3> 

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}> 
                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Toppscorer (q1)</div> 
                                    <select value={part2Actual.q1 || ""} onChange={(e) => updatePart2Field("q1", e.target.value)} style={{ width: "100%", padding: 6 }}> 
                                        <option value="">Velg</option> 
                                        {SCORERS.map((v) => <option key={v} value={v}>{v}</option>)} 
                                    </select> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Antall mål for toppscorer (q2)</div> 
                                    <input type="number" min={0} value={part2Actual.q2 || ""} onChange={(e) => updatePart2Field("q2", e.target.value)} style={{ width: "100%", padding: 4 }} /> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Mestscorende lag (q3)</div> 
                                    <select value={part2Actual.q3 || ""} onChange={(e) => updatePart2Field("q3", e.target.value)} style={{ width: "100%", padding: 6 }}> 
                                        <option value="">Velg</option> 
                                        {TEAMS.map((v) => <option key={v} value={v}>{v}</option>)} 
                                    </select> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Flest mål imot (q4)</div> 
                                    <select value={part2Actual.q4 || ""} onChange={(e) => updatePart2Field("q4", e.target.value)} style={{ width: "100%", padding: 6 }}> 
                                        <option value="">Velg</option> 
                                        {TEAMS.map((v) => <option key={v} value={v}>{v}</option>)} 
                                    </select> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Ant mål i finalen (q5)</div> 
                                    <input type="number" min={0} value={part2Actual.q5 || ""} onChange={(e) => updatePart2Field("q5", e.target.value)} style={{ width: "100%", padding: 4 }} /> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Totalt ant mål (q6)</div> 
                                    <select value={part2Actual.q6 || ""} onChange={(e) => updatePart2Field("q6", e.target.value)} style={{ width: "100%", padding: 6 }}> 
                                        <option value="">Velg</option> 
                                        {TOTAL_GOALS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)} 
                                    </select> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Best av GER vs FRA (q7)</div> 
                                    <select value={part2Actual.q7 || ""} onChange={(e) => updatePart2Field("q7", e.target.value)} style={{ width: "100%", padding: 6 }}> 
                                        <option value="">Velg</option> 
                                        <option value="Tyskland">Tyskland</option> 
                                        <option value="Frankrike">Frankrike</option> 
                                    </select> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Flest gule kort (q8)</div> 
                                    <select value={part2Actual.q8 || ""} onChange={(e) => updatePart2Field("q8", e.target.value)} style={{ width: "100%", padding: 6 }}> 
                                        <option value="">Velg</option> 
                                        {TEAMS.map((v) => <option key={v} value={v}>{v}</option>)} 
                                    </select> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Første røde kort (q9)</div> 
                                    <select value={part2Actual.q9 || ""} onChange={(e) => updatePart2Field("q9", e.target.value)} style={{ width: "100%", padding: 6 }}> 
                                        <option value="">Velg</option> 
                                        {TEAMS.map((v) => <option key={v} value={v}>{v}</option>)} 
                                    </select> 
                                </label> 

                                <label style={{ display: "block" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4, fontWeight: "bold" }}>Brasil - Haiti (q10)</div> 
                                    <div style={{ display: "flex", gap: 6 }}> 
                                        <input type="number" min={0} value={part2Actual.q10_brazil || ""} onChange={(e) => updatePart2Field("q10_brazil", e.target.value)} style={{ width: 60, padding: 4 }} /> 
                                        <span style={{ alignSelf: "center" }}>-</span> 
                                        <input type="number" min={0} value={part2Actual.q10_haiti || ""} onChange={(e) => updatePart2Field("q10_haiti", e.target.value)} style={{ width: 60, padding: 4 }} /> 
                                    </div> 
                                </label> 

                                <div style={{ gridColumn: "1 / -1", marginTop: 8, padding: 10, border: "1px solid #ddd", borderRadius: 6, backgroundColor: "#fff" }}> 
                                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: "bold" }}>Kamper (m1/m2/m3)</div> 
                                    {[ 
                                        { key: "m1", label: "Kroatia - England" }, 
                                        { key: "m2", label: "Tyskland - Elfenbenskysten" }, 
                                        { key: "m3", label: "Uruguay - Spania" } 
                                    ].map((m) => ( 
                                        <div key={m.key} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: "1px dashed #eee" }}> 
                                            <div style={{ fontSize: 13, marginBottom: 4 }}>{m.label}</div> 
                                            <div style={{ display: "flex", gap: 12 }}> 
                                                {HUB_OPTIONS.map((opt) => ( 
                                                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}> 
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
                                <button onClick={handleSaveActual} disabled={!adminAuthenticated || isPart2Empty(part2Actual)} style={{ padding: "8px 16px", fontWeight: "bold" }}> 
                                    Lagre fasit 
                                </button> 
                            </div> 

                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}> 
                                Lagring validerer passordet på serveren; feil passord vil gi en feilmelding. 
                            </div> 

                            {adminMessage && <div style={{ marginTop: 8, fontWeight: "bold", color: adminMessage.includes("Feil") ? "#b91c1c" : "#16a34a" }}>{adminMessage}</div>} 
                        </div> 
                    )} 
                </div> 
            )} 

            {/* Rangeringstabell */}
            <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 10 }}> 
                <thead> 
                    <tr> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 40, backgroundColor: "#eaeaea", textAlign: "center" }}>Plass</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, backgroundColor: "#eaeaea", textAlign: "left" }}>Navn</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 60, backgroundColor: "#eaeaea", textAlign: "center" }}>Del 1</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 60, backgroundColor: "#eaeaea", textAlign: "center" }}>Del 2</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 60, backgroundColor: "#eaeaea", textAlign: "center" }}>Del 3</th> 
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 80, backgroundColor: "#eaeaea", textAlign: "center", fontWeight: "bold" }}>Total</th> 
                    </tr> 
                </thead> 
                <tbody> 
                    {sortedData.map((row, index) => { 
                        const p1 = pointsPart1(row, actual); 
                        const p2 = pointsPart2(row, actual); 
                        const p3 = pointsPart3(row, actual); 
                        const total = p1 + p2 + p3; 

                        return ( 
                            <tr key={row.id || index} style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" }}> 
                                <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center", fontWeight: "bold" }}>{index + 1}</td> 
                                <td style={{ border: "1px solid #ccc", padding: 8 }}>{row.name}</td> 
                                <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{p1}</td> 
                                <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{p2}</td> 
                                <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>{p3}</td> 
                                <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center", fontWeight: "bold", backgroundColor: "#f0fdf4" }}>{total}</td> 
                            </tr> 
                        ); 
                    })} 
                </tbody> 
            </table> 
        </div> 
    ); 
}