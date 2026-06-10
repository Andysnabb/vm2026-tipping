

import { useEffect, useMemo, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL;
// Samme struktur som i VM-arket / LivePage
const ROUND_OF_32_MATCHES = [["A2", "C1"], ["B2", "F2"], ["E1", "F1"], ["3C", "C2"], ["G1", "D1"], ["3A", "3B"], ["H1", "K2"], ["J2", "L2"], ["E2", "I1"], ["I2", "3F"], ["A1", "L1"], ["3H", "3E"], ["B1", "D2"], ["3G", "G2"], ["J1", "K1"], ["H2", "3D"]];
const EMPTY = { roundOf32: Array(16).fill(""), roundOf16: Array(8).fill(""), quarterfinals: Array(4).fill(""), semifinals: Array(2).fill(""), bronze: Array(1).fill(""), final: Array(1).fill("") };
function getId() { return localStorage.getItem("participantId") || ""; }
function setId(id) { localStorage.setItem("participantId", id); }
export default function Part3Page() {
    const [participantId, setParticipantId] = useState(""); const [inputId, setInputId] = useState(""); const [state, setState] = useState(EMPTY); const [loading, setLoading] = useState(false);

    useEffect(() => {
        const id = getId().trim();
        setParticipantId(id);
        setInputId(id);
    }, []);

    function pickWinnerOrPlaceholder(roundArray, index, fallback) {
        return roundArray[index] || fallback;
    }

    const BRACKET_URL =
        "https://sportscore.com/api/widget/bracket/?sport=football&slug=fifa-world-cup&src=vm2026-tipping";

    const [roundOf32Teams, setRoundOf32Teams] = useState(
        Array(16).fill(["", ""])
    );
    function normalizeTeamName(v) {
        if (!v) return "";
        if (typeof v === "string") return v;
        return v.name || v.team_name || v.title || v.label || v.slug || "";
    }

    useEffect(() => {
        async function loadBracket() {
            try {
                const res = await fetch(BRACKET_URL);
                const data = await res.json();

                const matches =
                    data?.rounds?.find((r) => r.name === "match_ups")?.matchups || [];

                const parsed = matches.slice(0, 16).map((match) => [
                    normalizeTeamName(match?.home),
                    normalizeTeamName(match?.away)
                ]);

                if (parsed.length === 16) {
                    setRoundOf32Teams(parsed);
                }
            } catch (err) {
                console.error(err);
            }
        }

        loadBracket();
    }, []);

    async function load() {
        if (!API_URL || !inputId.trim()) return;

        const id = inputId.trim();

        setLoading(true);
        setId(id);
        setParticipantId(id);

        const res = await fetch(
            `${API_URL}?action=submission&participantId=${encodeURIComponent(id)}`
        );
        const data = await res.json();
        if (data?.ok && data.submission?.part3Json) {
            const parsed = JSON.parse(data.submission.part3Json);
            setState(parsed);
        } else {
            setState(EMPTY);
        }
        setLoading(false);
    }

    async function save() {
        if (!participantId || !API_URL) return;

        await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "savePartV2",
                part: "part3",
                participantId,
                data: state
            })
        });
    }
    function updateRoundOf32(index, team) {
        const next = [...state.roundOf32];
        next[index] = team;

        // nullstill videre runder når noe endres
        setState({
            ...state,
            roundOf32: next,
            roundOf16: Array(8).fill(""),
            quarterfinals: Array(4).fill(""),
            semifinals: Array(2).fill(""),
            bronze: [""],
            final: [""]
        });
    }
    function updateRoundOf16(index, team) {
        const next = [...state.roundOf16];
        next[index] = team;
        setState({
            ...state,
            roundOf16: next,
            quarterfinals: Array(4).fill(""),
            semifinals: Array(2).fill(""),
            bronze: [""],
            final: [""]
        });
    }
    function updateQuarter(index, team) {
        const next = [...state.quarterfinals];
        next[index] = team;
        setState({
            ...state,
            quarterfinals: next,
            semifinals: Array(2).fill(""),
            bronze: [""],
            final: [""]
        });
    }
    function updateSemi(index, team) {
        const next = [...state.semifinals];
        next[index] = team;

        setState({
            ...state,
            semifinals: next,
            bronze: [""],
            final: [""]
        });
    }
    function updateFinal(team) {
        setState({
            ...state,
            final: [team]
        });
    }

    function getRoundOf16Matches() {
        const matches = [];

        for (let i = 0; i < 8; i++) {
            matches.push([
                state.roundOf32[i * 2] || roundOf32Teams[i * 2]?.[0] || "",
                state.roundOf32[i * 2 + 1] || roundOf32Teams[i * 2 + 1]?.[1] || ""
            ]);
        }

        return matches;
    }

    function getQuarterMatches() {
        const matches = [];
        const prev = getRoundOf16Matches();
        for (let i = 0; i < 4; i++) {
            matches.push([
                state.roundOf16[i * 2] || prev[i * 2]?.[0] || "",
                state.roundOf16[i * 2 + 1] || prev[i * 2 + 1]?.[1] || ""
            ]);
        }

        return matches;
    }

    function getSemiMatches() {
        return [
            [
                state.quarterfinals[0],
                state.quarterfinals[1]
            ],
            [
                state.quarterfinals[2],
                state.quarterfinals[3]
            ]
        ];
    }
    function getFinalMatch() {
        return [
            state.semifinals[0],
            state.semifinals[1]
        ];
    }
    return (
        <div style={{ padding: 20 }}>
            <h1>Part 3</h1>

            <input
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="Deltaker-ID"
            />
            <button onClick={load}>Hent</button>
            {loading ? (
                <div>Laster...</div>
            ) : (
                <div>ID: {participantId || "mangler"}</div>
            )}
            <h2 style={{ margin: "24px 0 12px 0", fontSize: 24 }}>16-delsfinaler</h2>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                {roundOf32Teams.map((match, i) => (
                    <div
                        key={i}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            padding: 12,
                            boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                            width: 290,
                            minHeight: 124
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "#374151"
                                }}
                            >
                                16-delsfinale {i + 1}
                            </span>
                        </div>

                        {match.map((team, j) => {
                            const checked = state.roundOf32[i] === team;

                            return (
                                <label
                                    key={`${i}-${j}`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        minHeight: 32,
                                        padding: "6px 8px",
                                        marginBottom: 8,
                                        borderRadius: 10,
                                        backgroundColor: checked ? "#ecfdf5" : "#f9fafb",
                                        border: checked ? "1px solid #86efac" : "1px solid transparent",
                                        cursor: "pointer"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`r32-${i}`}
                                        checked={checked}
                                        onChange={() => updateRoundOf32(i, team)}
                                    />
                                    <span
                                        style={{
                                            display: "inline-block",
                                            maxWidth: 220,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: checked ? "#166534" : "#111827"
                                        }}
                                        title={team || "TBD"}
                                    >
                                        {team || "TBD"}
                                    </span>
                                    {checked ? (
                                        <span
                                            style={{
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
                                            }}
                                        >
                                            Vinner
                                        </span>
                                    ) : null}
                                </label>
                            );
                        })}
                    </div>
                ))}
            </div>
            <h2 style={{ margin: "24px 0 12px 0", fontSize: 24 }}>8-delsfinaler</h2>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                {getRoundOf16Matches().map((match, i) => {
                    const teams = [
                        pickWinnerOrPlaceholder(state.roundOf32, i * 2, match[0]),
                        pickWinnerOrPlaceholder(state.roundOf32, i * 2 + 1, match[1])
                    ];
                    return (
                        <div
                            key={i}
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 16,
                                padding: 12,
                                boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                                width: 290,
                                minHeight: 124
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 10
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: "#374151"
                                    }}
                                >
                                    8-delsfinale {i + 1}
                                </span>
                            </div>

                            {teams.map((team, j) => {
                                const checked = state.roundOf16[i] === team;

                                return (
                                    <label
                                        key={`${i}-${j}`}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            minHeight: 32,
                                            padding: "6px 8px",
                                            marginBottom: 8,
                                            borderRadius: 10,
                                            backgroundColor: checked ? "#ecfdf5" : "#f9fafb",
                                            border: checked ? "1px solid #86efac" : "1px solid transparent",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name={`r16-${i}`}
                                            checked={checked}
                                            onChange={() => updateRoundOf16(i, team)}
                                        />
                                        <span
                                            style={{
                                                display: "inline-block",
                                                maxWidth: 220,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: checked ? "#166534" : "#111827"
                                            }}
                                            title={team || "TBD"}
                                        >
                                            {team || "TBD"}
                                        </span>
                                        {checked ? (
                                            <span
                                                style={{
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
                                                }}
                                            >
                                                Vinner
                                            </span>
                                        ) : null}
                                    </label>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <h2 style={{ margin: "24px 0 12px 0", fontSize: 24 }}>Kvartfinaler</h2>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                {getQuarterMatches().map((match, i) => (
                    <div
                        key={i}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            padding: 12,
                            boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                            width: 290,
                            minHeight: 124
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "#374151"
                                }}
                            >
                                Kvartfinale {i + 1}
                            </span>
                        </div>

                        {match.map((team, j) => {
                            const checked = state.quarterfinals[i] === team;

                            return (
                                <label
                                    key={`${i}-${j}`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        minHeight: 32,
                                        padding: "6px 8px",
                                        marginBottom: 8,
                                        borderRadius: 10,
                                        backgroundColor: checked ? "#ecfdf5" : "#f9fafb",
                                        border: checked ? "1px solid #86efac" : "1px solid transparent",
                                        cursor: "pointer"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`qf-${i}`}
                                        checked={checked}
                                        onChange={() => updateQuarter(i, team)}
                                    />
                                    <span
                                        style={{
                                            display: "inline-block",
                                            maxWidth: 220,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: checked ? "#166534" : "#111827"
                                        }}
                                        title={team || "TBD"}
                                    >
                                        {team || "TBD"}
                                    </span>
                                    {checked ? (
                                        <span
                                            style={{
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
                                            }}
                                        >
                                            Vinner
                                        </span>
                                    ) : null}
                                </label>
                            );
                        })}
                    </div>
                ))}
            </div>

            <h2 style={{ margin: "24px 0 12px 0", fontSize: 24 }}>Semifinaler</h2>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                {getSemiMatches().map((match, i) => (
                    <div
                        key={i}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            padding: 12,
                            boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                            width: 290,
                            minHeight: 124
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "#374151"
                                }}
                            >
                                Semifinale {i + 1}
                            </span>
                        </div>

                        {match.map((team, j) => {
                            const labelTeam = team || "TBD";
                            const checked = state.semifinals[i] === team;

                            return (
                                <label
                                    key={`${i}-${j}`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        minHeight: 32,
                                        padding: "6px 8px",
                                        marginBottom: 8,
                                        borderRadius: 10,
                                        backgroundColor: checked ? "#ecfdf5" : "#f9fafb",
                                        border: checked ? "1px solid #86efac" : "1px solid transparent",
                                        cursor: "pointer"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={`sf-${i}`}
                                        checked={checked}
                                        onChange={() => updateSemi(i, team)}
                                    />
                                    <span
                                        style={{
                                            display: "inline-block",
                                            maxWidth: 220,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: checked ? "#166534" : "#111827"
                                        }}
                                        title={labelTeam}
                                    >
                                        {labelTeam}
                                    </span>
                                    {checked ? (
                                        <span
                                            style={{
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
                                            }}
                                        >
                                            Vinner
                                        </span>
                                    ) : null}
                                </label>
                            );
                        })}
                    </div>
                ))}
            </div>

            <h2 style={{ margin: "24px 0 12px 0", fontSize: 24 }}>Finale</h2>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                {(() => {
                    const teams = getFinalMatch();
                    const pair = [teams[0], teams[1]];
                    return (
                        <div
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 16,
                                padding: 12,
                                boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                                width: 290,
                                minHeight: 124
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 10
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: "#374151"
                                    }}
                                >
                                    Finale
                                </span>
                            </div>

                            {pair.map((team, j) => {
                                const labelTeam = team || "TBD";
                                const checked = state.final[0] === team;

                                return (
                                    <label
                                        key={`${j}`}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            minHeight: 32,
                                            padding: "6px 8px",
                                            marginBottom: 8,
                                            borderRadius: 10,
                                            backgroundColor: checked ? "#ecfdf5" : "#f9fafb",
                                            border: checked ? "1px solid #86efac" : "1px solid transparent",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="final"
                                            checked={checked}
                                            onChange={() => updateFinal(team)}
                                        />
                                        <span
                                            style={{
                                                display: "inline-block",
                                                maxWidth: 220,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: checked ? "#166534" : "#111827"
                                            }}
                                            title={labelTeam}
                                        >
                                            {labelTeam}
                                        </span>
                                        {checked ? (
                                            <span
                                                style={{
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
                                                }}
                                            >
                                                Vinner
                                            </span>
                                        ) : null}
                                    </label>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            <h2 style={{ margin: "24px 0 12px 0", fontSize: 24 }}>Bronsefinale</h2>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24
                }}
            >
                {getSemiMatches().length === 2 && (() => {
                    const teams = [
                        state.semifinals[0] === getSemiMatches()[0][0]
                            ? getSemiMatches()[0][1]
                            : getSemiMatches()[0][0],
                        state.semifinals[1] === getSemiMatches()[1][0]
                            ? getSemiMatches()[1][1]
                            : getSemiMatches()[1][0]
                    ];

                    return (
                        <div
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 16,
                                padding: 12,
                                boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                                width: 290,
                                minHeight: 124
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 10
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: "#374151"
                                    }}
                                >
                                    Bronsefinale
                                </span>
                            </div>

                            {teams.map((team, j) => {
                                const labelTeam = team || "TBD";
                                const checked = state.bronze[0] === team;

                                return (
                                    <label
                                        key={`${j}`}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            minHeight: 32,
                                            padding: "6px 8px",
                                            marginBottom: 8,
                                            borderRadius: 10,
                                            backgroundColor: checked ? "#ecfdf5" : "#f9fafb",
                                            border: checked ? "1px solid #86efac" : "1px solid transparent",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="bronze"
                                            checked={checked}
                                            onChange={() => setState({ ...state, bronze: [team] })}
                                        />
                                        <span
                                            style={{
                                                display: "inline-block",
                                                maxWidth: 220,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: checked ? "#166534" : "#111827"
                                            }}
                                            title={labelTeam}
                                        >
                                            {labelTeam}
                                        </span>
                                        {checked ? (
                                            <span
                                                style={{
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
                                                }}
                                            >
                                                Vinner
                                            </span>
                                        ) : null}
                                    </label>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            <br />
            <button onClick={save} style={{ marginTop: 20 }}>            Lagre
            </button>
        </div>
    );
}
