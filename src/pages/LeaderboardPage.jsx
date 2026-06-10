import { useEffect, useMemo, useState } from "react";
import { getActuals, saveActual } from "../lib/api";

//const API_URL = import.meta.env.VITE_API_URL;
import { API_BASE } from "../config";
// FYLL INN FASIT HER ETTERHVERT SOM TURNERINGEN SPILLES
const ACTUAL = {
    groups: {
        A: [],
        B: [],
        C: [],
        D: [],
        E: [],
        F: [],
        G: [],
        H: [],
        I: [],
        J: [],
        K: [],
        L: []
    },
    part2: {
        q1: "",
        q2: "",
        q3: "",
        q4: "",
        q5: "",
        q6: "",
        q7: "",
        q8: "",
        q9: "",
        q10_brazil: "",
        q10_haiti: "",
        m1: "",
        m2: "",
        m3: ""
    },
    knockout: {
        // Vinnere i 16-delsfinalene (= lag i 8-delsfinalene)
        roundOf32: [],
        // Vinnere i 8-delsfinalene (= lag i kvartfinalene)
        roundOf16: [],
        // Vinnere i kvartfinalene (= lag i semifinalene)
        quarterfinals: [],
        // Finalelag
        semifinals: [],
        champion: "",
        runnerUp: "",
        bronze: "",
        fourth: ""
    }
};

// Local copies of options used in Part2 UI
const SCORERS = [
    "Álvarez (ARG)","Balogun (USA)","Dembélé (FRA)","Depay (NED)","Haaland (NOR)","Kane (ENG)","Lukaku (BEL)","Martínez (ARG)","Mbappé (FRA)","Messi (ARG)","Oyarzabal (ESP)","Pulisic (USA)","Raphinha (BRA)","Rashford (ENG)","Ronaldo (POR)","Saka (ENG)","Torres (ESP)","Vinícius Jr. (BRA)","Woltemade (GER)","Yamal (ESP)","(en annen)"
];

const TEAMS = [
    "Algerie","Argentina","Australia","Belgia","Bosnia-Hercegovina","Brasil","Canada","Colombia","Curacao","DR Kongo","Ecuador","Egypt","Elfenbenskysten","England","Frankrike","Ghana","Haiti","Irak","Iran","Japan","Jordan","Kapp Verde","Kroatia","Marokko","Mexico","Nederland","New Zealand","Norge","Panama","Paraguay","Portugal","Qatar","Saudi-Arabia","Senegal","Skottland","Spania","Sveits","Sverige","Sør-Afrika","Sør-Korea","Tsjekkia","Tunisia","Tyrkia","Tyskland","Uruguay","USA","Usbekistan","Østerrike"
];

const TOTAL_GOALS_OPTIONS = [
    "250 el. færre","251-275","276-305","306-330","331 el. flere"
];

const HUB_OPTIONS = ["H","U","B"];

function safeJsonParse(value, fallback = null) {
    if (!value) return fallback;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normalizeTeam(value) {
    return String(value || "").trim();
}

function normalizeAnswer(value) {
    return String(value ?? "").trim();
}

function matchesActual(predicted, actual) {
    const normalizedPredicted = normalizeAnswer(predicted);

    if (!normalizedPredicted) return false;

    if (Array.isArray(actual)) {
        return actual.map(normalizeAnswer).includes(normalizedPredicted);
    }

    return normalizedPredicted === normalizeAnswer(actual);
}

// Merge ACTUAL with any stored actuals from localStorage (set by LivePage and Part2Page admin UI)
function resolveActual() {
    if (typeof window === "undefined") return ACTUAL;

    // If server-provided actuals were loaded, use them
    if (window.__ACTUAL_SERVER) return window.__ACTUAL_SERVER;

    let storedPart2 = safeJsonParse(localStorage.getItem("actual_part2"), {}) || {};
    let storedLive = safeJsonParse(localStorage.getItem("actual_live"), {}) || {};

    const merged = {
        groups: { ...(ACTUAL.groups || {}), ...(storedLive.groups || {}) },
        part2: { ...(ACTUAL.part2 || {}), ...(storedPart2 || {}), ...(storedLive.part2 || {}) },
        knockout: { ...(ACTUAL.knockout || {}), ...(storedLive.knockout || {}) }
    };

    return merged;
}

// Load server actuals once and store globally for synchronous access in scoring helpers
if (typeof window !== "undefined") {
    (async () => {
        try {
            const res = await getActuals();
            if (res && res.ok && res.data) {
                const server = res.data || {};
                const merged = {
                    groups: { ...(ACTUAL.groups || {}), ...(server.groups || {}) },
                    part2: { ...(ACTUAL.part2 || {}), ...(server.part2 || {}) },
                    knockout: { ...(ACTUAL.knockout || {}), ...(server.knockout || {}) }
                };
                window.__ACTUAL_SERVER = merged;
            }
        } catch {
            // ignore
        }
    })();
}

function pointsPart1(row) {
    const part1 = safeJsonParse(row.part1Json, { groups: {} });
    const predictedGroups = part1?.groups || {};

    let points = 0;

    const actual = resolveActual();

    for (const [group, actualOrderRaw] of Object.entries(actual.groups || {})) {
        const actualOrder = Array.isArray(actualOrderRaw)
            ? actualOrderRaw.map(normalizeTeam)
            : [];
        const predictedOrder = Array.isArray(predictedGroups[group])
            ? predictedGroups[group].map(normalizeTeam)
            : [];

        for (let i = 0; i < 4; i++) {
            if (predictedOrder[i] && predictedOrder[i] === actualOrder[i]) {
                points += 1;
            }
        }

        if (predictedOrder[0] && actualOrder[0] && predictedOrder[0] === actualOrder[0]) {
            points += 2;
        }
    }

    return points;
}

function pointsPart2(row) {
    const part2 = safeJsonParse(row.part2Json, {});
    let points = 0;

    const actual = resolveActual();
    const actualPart2 = actual.part2 || {};

    const questionFields = [
        "q1",
        "q2",
        "q3",
        "q4",
        "q5",
        "q6",
        "q7",
        "q8",
        "q9",
        "q10_brazil",
        "q10_haiti"
    ];

    questionFields.forEach((field) => {
        if (matchesActual(part2?.[field], actualPart2?.[field])) {
            points += 2;
        }
    });

    ["m1", "m2", "m3"].forEach((field) => {
        if (matchesActual(part2?.[field], actualPart2?.[field])) {
            points += 2;
        }
    });

    return points;
}

function getPredictedFinalists(part3) {
    return Array.isArray(part3?.semifinals)
        ? part3.semifinals.map(normalizeTeam).filter(Boolean)
        : [];
}

function getPredictedChampion(part3) {
    return normalizeTeam(part3?.final?.[0]);
}

function getPredictedRunnerUp(part3) {
    const finalists = getPredictedFinalists(part3);
    const champion = getPredictedChampion(part3);

    return finalists.find((team) => team && team !== champion) || "";
}

function getPredictedSemifinalists(part3) {
    return Array.isArray(part3?.quarterfinals)
        ? part3.quarterfinals.map(normalizeTeam).filter(Boolean)
        : [];
}

function getPredictedBronzeMatchTeams(part3) {
    const semifinalists = getPredictedSemifinalists(part3);
    const finalists = getPredictedFinalists(part3);

    return semifinalists.filter((team) => team && !finalists.includes(team));
}

function getPredictedBronzeWinner(part3) {
    return normalizeTeam(part3?.bronze?.[0]);
}

function getPredictedFourth(part3) {
    const bronzeTeams = getPredictedBronzeMatchTeams(part3);
    const bronzeWinner = getPredictedBronzeWinner(part3);

    return bronzeTeams.find((team) => team && team !== bronzeWinner) || "";
}

function pointsPart3(row) {
    const part3 = safeJsonParse(row.part3Json, null);
    if (!part3) return 0;

    let points = 0;

    const predictedRoundOf32 = Array.isArray(part3.roundOf32)
        ? part3.roundOf32.map(normalizeTeam).filter(Boolean)
        : [];
    const predictedRoundOf16 = Array.isArray(part3.roundOf16)
        ? part3.roundOf16.map(normalizeTeam).filter(Boolean)
        : [];
    const predictedQuarterfinals = Array.isArray(part3.quarterfinals)
        ? part3.quarterfinals.map(normalizeTeam).filter(Boolean)
        : [];

    const actual = resolveActual();
    const actualRoundOf32 = Array.isArray(actual.knockout?.roundOf32)
        ? actual.knockout.roundOf32.map(normalizeTeam).filter(Boolean)
        : [];
    const actualRoundOf16 = Array.isArray(actual.knockout?.roundOf16)
        ? actual.knockout.roundOf16.map(normalizeTeam).filter(Boolean)
        : [];
    const actualQuarterfinals = Array.isArray(actual.knockout?.quarterfinals)
        ? actual.knockout.quarterfinals.map(normalizeTeam).filter(Boolean)
        : [];

    predictedRoundOf32.forEach((team) => {
        if (actualRoundOf32.includes(team)) points += 1;
    });

    predictedRoundOf16.forEach((team) => {
        if (actualRoundOf16.includes(team)) points += 2;
    });

    predictedQuarterfinals.forEach((team) => {
        if (actualQuarterfinals.includes(team)) points += 3;
    });

    const predictedChampion = getPredictedChampion(part3);
    const predictedRunnerUp = getPredictedRunnerUp(part3);
    const predictedBronze = getPredictedBronzeWinner(part3);
    const predictedFourth = getPredictedFourth(part3);

    const actualChampion = normalizeTeam(actual.knockout?.champion);
    const actualRunnerUp = normalizeTeam(actual.knockout?.runnerUp);
    const actualBronze = normalizeTeam(actual.knockout?.bronze);
    const actualFourth = normalizeTeam(actual.knockout?.fourth);

    if (predictedChampion && actualChampion && predictedChampion === actualChampion) {
        points += 10;
    }

    if (predictedRunnerUp && actualRunnerUp && predictedRunnerUp === actualRunnerUp) {
        points += 5;
    }

    if (
        predictedChampion &&
        predictedRunnerUp &&
        actualChampion &&
        actualRunnerUp &&
        predictedChampion === actualRunnerUp &&
        predictedRunnerUp === actualChampion
    ) {
        points += 8;
    }

    if (predictedBronze && actualBronze && predictedBronze === actualBronze) {
        points += 3;
    }

    if (predictedFourth && actualFourth && predictedFourth === actualFourth) {
        points += 3;
    }

    return points;
}

function calculatePoints(row) {
    return pointsPart1(row) + pointsPart2(row) + pointsPart3(row);
}

function hasCorrectChampion(row) {
    const part3 = safeJsonParse(row.part3Json, null);
    const actual = resolveActual();
    return getPredictedChampion(part3) === normalizeTeam(actual.knockout?.champion);
}

function hasCorrectRunnerUp(row) {
    const part3 = safeJsonParse(row.part3Json, null);
    const actual = resolveActual();
    return getPredictedRunnerUp(part3) === normalizeTeam(actual.knockout?.runnerUp);
}

export default function LeaderboardPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminVisible, setAdminVisible] = useState(false);
    const [adminPassword, setAdminPassword] = useState("");
    const [adminMessage, setAdminMessage] = useState("");
    const [adminAuthenticated, setAdminAuthenticated] = useState(false);
    const [serverActual, setServerActual] = useState(null);
    // initialize with defaults from ACTUAL.part2 so missing fields are preserved
    const [part2Actual, setPart2Actual] = useState({ ...(ACTUAL.part2 || {}) });

    useEffect(() => {
        async function load() {
            if (!API_BASE) return;

            setLoading(true);

            const res = await fetch(`${API_BASE}?action=all`);
            const result = await res.json();

            if (result.ok) {
                setData(result.data);
            }

            setLoading(false);
        }

        load();
    }, []);

    // Load server actuals explicitly into component state
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await getActuals();
                if (res && res.ok && res.data) {
                    const srv = res.data || {};
                    if (mounted) {
                        setServerActual(srv);
                        window.__ACTUAL_SERVER = {
                            groups: { ...(ACTUAL.groups || {}), ...(srv.groups || {}) },
                            part2: { ...(ACTUAL.part2 || {}), ...(srv.part2 || {}) },
                            knockout: { ...(ACTUAL.knockout || {}), ...(srv.knockout || {}) }
                        };
                        // initialize part2Actual from server data if present
                        if (srv.part2) setPart2Actual(prev => ({ ...prev, ...srv.part2 }));
                    }
                }
            } catch {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, []);

    // When an admin logs in, (re)fetch server actuals and populate the admin form
    useEffect(() => {
        if (!adminAuthenticated) return;

        let mounted = true;
        (async () => {
            try {
                const res = await getActuals();
                    if (res && res.ok && res.data && mounted) {
                    const srv = res.data || {};
                    setServerActual(srv);
                    // populate form fields for part2 from server data
                    // merge server values over defaults so fields not present on server keep defaults
                    setPart2Actual(prev => ({ ...(ACTUAL.part2 || {}), ...prev, ...(srv.part2 || {}) }));
                    // update global actuals used by scoring helpers
                    window.__ACTUAL_SERVER = {
                        groups: { ...(ACTUAL.groups || {}), ...(srv.groups || {}) },
                        part2: { ...(ACTUAL.part2 || {}), ...(srv.part2 || {}) },
                        knockout: { ...(ACTUAL.knockout || {}), ...(srv.knockout || {}) }
                    };
                }
            } catch (err) {
                // ignore
            }
        })();

        return () => { mounted = false; };
    }, [adminAuthenticated]);

    function updatePart2Field(field, value) {
        setPart2Actual(prev => ({ ...prev, [field]: value }));
    }

    function isPart2Empty(obj) {
        return Object.values(obj || {}).every(v => v === "" || v === null || typeof v === 'undefined');
    }

    async function handleSaveActual() {
        setAdminMessage("");
        try {
            // Ensure we call the API_BASE computed by src/config.js; saveActual uses API_BASE internally
            const res = await saveActual({ password: adminPassword, data: { part2: part2Actual } });
            console.log("saveActual response:", res);
            if (res && res.ok) {
                setAdminMessage("Fasit lagret på server");
                const srv = { ...(serverActual || {}), part2: part2Actual };
                setServerActual(srv);
                window.__ACTUAL_SERVER = {
                    groups: { ...(ACTUAL.groups || {}), ...(srv.groups || {}) },
                    part2: { ...(ACTUAL.part2 || {}), ...(srv.part2 || {}) },
                    knockout: { ...(ACTUAL.knockout || {}), ...(srv.knockout || {}) }
                };
            } else {
                const msg = res && (res.error || res.raw || (res.data && JSON.stringify(res.data)) ) ? (res.error || res.raw || JSON.stringify(res.data)) : null;
                setAdminMessage(msg ? `Feil ved lagring: ${msg}` : `Kunne ikke lagre fasit på server (status ${res && res.status ? res.status : 'n/a'})`);
            }
        } catch (err) {
            console.error('saveActual failed', err);
            setAdminMessage("Feil ved lagring av fasit (nettverksfeil). Sjekk at API_BASE og proxy er riktig konfigurert.");
        }
    }

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const totalDiff = calculatePoints(b) - calculatePoints(a);
            if (totalDiff !== 0) return totalDiff;

            const championDiff = Number(hasCorrectChampion(b)) - Number(hasCorrectChampion(a));
            if (championDiff !== 0) return championDiff;

            const runnerUpDiff = Number(hasCorrectRunnerUp(b)) - Number(hasCorrectRunnerUp(a));
            if (runnerUpDiff !== 0) return runnerUpDiff;

            return String(a.name || "").localeCompare(String(b.name || ""), "nb");
        });
    }, [data]);

    if (loading) {
        return <div>Laster...</div>;
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Poeng</h1>

            <div style={{ marginBottom: 12 }}>
                <button onClick={() => setAdminVisible(v => !v)} style={{ marginRight: 8 }}>
                    {adminVisible ? "Skjul admin" : "Admin: Endre fasit"}
                </button>
                {adminVisible && (
                    <span style={{ color: "#6b7280" }}>Kun synlig for administratorer som kjenner passordet.</span>
                )}
                {/* Small explanatory note about scoring sources */}
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    Merk: Poeng beregnes med server-fasit for Del 2 og live-data for Del 1/Del 3.
                </div>
            </div>

            {adminVisible && (
                <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    {!adminAuthenticated ? (
                            <div>
                                <div style={{ marginBottom: 8 }}>Admin-passord:</div>
                                <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)} style={{ padding: 8, marginBottom: 8 }} />
                                <div>
                                    <button onClick={() => {
                                        // Do not hard-code password on client — accept any non-empty entry locally
                                        // and rely on server-side validation when saving the actuals.
                                        if (adminPassword && adminPassword.length > 0) {
                                            setAdminAuthenticated(true);
                                            setAdminMessage("Innlogget som admin (server valideres ved lagring)");
                                        } else {
                                            setAdminMessage("Skriv inn passord");
                                        }
                                    }} disabled={!adminPassword}>Logg inn</button>
                                </div>
                                {adminMessage && <div style={{ marginTop: 8 }}>{adminMessage}</div>}
                            </div>
                    ) : (
                    <div>
                        <div style={{ marginBottom: 8 }}>
                            Innlogget som admin. <button onClick={() => { setAdminAuthenticated(false); setAdminPassword(""); setAdminMessage(""); }}>Logg ut</button>
                        </div>

                        <h4>Fasit del 2</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Toppscorer (q1)</div>
                            <select value={part2Actual.q1 || ""} onChange={e => updatePart2Field("q1", e.target.value)}>
                                <option value="">Velg</option>
                                {SCORERS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Antall mål for toppscorer (q2)</div>
                            <input type="number" min={0} value={part2Actual.q2 || ""} onChange={e => updatePart2Field("q2", e.target.value)} />
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Mestscorende lag (q3)</div>
                            <select value={part2Actual.q3 || ""} onChange={e => updatePart2Field("q3", e.target.value)}>
                                <option value="">Velg</option>
                                {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Flest mål imot (q4)</div>
                            <select value={part2Actual.q4 || ""} onChange={e => updatePart2Field("q4", e.target.value)}>
                                <option value="">Velg</option>
                                {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Ant mål i finalen (q5)</div>
                            <input type="number" min={0} value={part2Actual.q5 || ""} onChange={e => updatePart2Field("q5", e.target.value)} />
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Totalt ant mål (q6)</div>
                            <select value={part2Actual.q6 || ""} onChange={e => updatePart2Field("q6", e.target.value)}>
                                <option value="">Velg</option>
                                {TOTAL_GOALS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Best av GER vs FRA (q7)</div>
                            <select value={part2Actual.q7 || ""} onChange={e => updatePart2Field("q7", e.target.value)}>
                                <option value="">Velg</option>
                                <option value="Tyskland">Tyskland</option>
                                <option value="Frankrike">Frankrike</option>
                            </select>
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Flest gule kort (q8)</div>
                            <select value={part2Actual.q8 || ""} onChange={e => updatePart2Field("q8", e.target.value)}>
                                <option value="">Velg</option>
                                {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Første røde kort (q9)</div>
                            <select value={part2Actual.q9 || ""} onChange={e => updatePart2Field("q9", e.target.value)}>
                                <option value="">Velg</option>
                                {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </label>

                        <label>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Brasil - Haiti (q10)</div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <input type="number" min={0} value={part2Actual.q10_brazil || ""} onChange={e => updatePart2Field("q10_brazil", e.target.value)} style={{ width: 80 }} />
                                <span style={{ alignSelf: "center" }}>-</span>
                                <input type="number" min={0} value={part2Actual.q10_haiti || ""} onChange={e => updatePart2Field("q10_haiti", e.target.value)} style={{ width: 80 }} />
                            </div>
                        </label>

                        <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Kamper (m1/m2/m3)</div>
                            {[{key:"m1",label:"Kroatia - England"},{key:"m2",label:"Tyskland - Elfenbenskysten"},{key:"m3",label:"Uruguay - Spania"}].map(m => (
                                <div key={m.key} style={{ marginBottom: 6 }}>
                                    <div style={{ marginBottom: 4 }}>{m.label}</div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {HUB_OPTIONS.map(opt => (
                                            <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <input type="radio" name={m.key} checked={part2Actual[m.key] === opt} onChange={() => updatePart2Field(m.key, opt)} />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        </div>

                        <div style={{ marginTop: 12 }}>
                            <button onClick={handleSaveActual} disabled={!adminAuthenticated || isPart2Empty(part2Actual)}>Lagre fasit</button>
                        </div>

                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                            Lagring validerer passordet på serveren; feil passord vil gi en feilmelding.
                        </div>

                        {adminMessage && <div style={{ marginTop: 8 }}>{adminMessage}</div>}
                    </div>
                    )}
                </div>
            )}

            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                    <tr>
                        <th
                            style={{
                                border: "1px solid #ccc",
                                padding: 6,
                                width: 30,
                                backgroundColor: "#eaeaea"
                            }}
                        ></th>
                        <th
                            style={{
                                border: "1px solid #ccc",
                                padding: 6,
                                backgroundColor: "#eaeaea"
                            }}
                        >
                            Navn
                        </th>
                        <th
                            style={{
                                border: "1px solid #ccc",
                                padding: 6,
                                backgroundColor: "#eaeaea"
                            }}
                        >
                            Del 1
                        </th>
                        <th
                            style={{
                                border: "1px solid #ccc",
                                padding: 6,
                                backgroundColor: "#eaeaea"
                            }}
                        >
                            Del 2
                        </th>
                        <th
                            style={{
                                border: "1px solid #ccc",
                                padding: 6,
                                backgroundColor: "#eaeaea"
                            }}
                        >
                            Del 3
                        </th>
                        <th
                            style={{
                                border: "1px solid #ccc",
                                padding: 6,
                                backgroundColor: "#eaeaea"
                            }}
                        >
                            Totalt
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {sortedData.map((row, index) => (
                        <tr key={row.participantId || index}>
                            <td
                                style={{
                                    border: "1px solid #ccc",
                                    padding: 6,
                                    width: 30,
                                    backgroundColor: "#eaeaea"
                                }}
                            >
                                {index + 1}
                            </td>

                            <td style={{ border: "1px solid #ccc", padding: 6 }}>
                                {row.name}
                            </td>

                            <td style={{ border: "1px solid #ccc", padding: 6 }}>
                                {pointsPart1(row)}
                            </td>

                            <td style={{ border: "1px solid #ccc", padding: 6 }}>
                                {pointsPart2(row)}
                            </td>

                            <td style={{ border: "1px solid #ccc", padding: 6 }}>
                                {pointsPart3(row)}
                            </td>

                            <td
                                style={{
                                    border: "1px solid #ccc",
                                    padding: 6,
                                    fontWeight: 700
                                }}
                            >
                                {calculatePoints(row)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
