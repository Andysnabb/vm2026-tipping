import { useEffect, useState } from "react";

//const API_URL = import.meta.env.VITE_API_URL;
import { API_BASE } from "../config";

const GROUPS = {
    A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
    B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
    C: ["Brazil", "Morocco", "Haiti", "Scotland"],
    D: ["United States", "Paraguay", "Australia", "Turkey"],
    E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
    F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
    G: ["Belgium", "Egypt", "Iran", "New Zealand"],
    H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    I: ["France", "Senegal", "Iraq", "Norway"],
    J: ["Argentina", "Algeria", "Austria", "Jordan"],
    K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    L: ["England", "Croatia", "Ghana", "Panama"]
};

const EMPTY = {
    name: "",
    email: "",
    groups: {}
};

function getId() {
    return localStorage.getItem("participantId") || "";
}

function setId(id) {
    localStorage.setItem("participantId", id);
}

export default function Part1Page() {
    const [participantId, setParticipantId] = useState("");
    const [inputId, setInputId] = useState("");
    const [state, setState] = useState(EMPTY);
    const [loading, setLoading] = useState(false);

    // SPERREDATO SETT TIL 11. JUNI 2026 KL. 21:05
    const SPERRE_DATO = new Date("2026-06-11T21:05:00");
    const nå = new Date();
    const erLåst = nå >= SPERRE_DATO; // MERK: Vi bruker >= siden siden skal LÅSES fra og med dette tidspunktet

    useEffect(() => {
        const id = getId();
        setParticipantId(id);
        setInputId(id);
    }, []);

    async function load() {
        if (!inputId || !API_BASE) return;

        const id = inputId.trim();

        setLoading(true);
        setId(id);
        setParticipantId(id);

        const res = await fetch(
            `${API_BASE}?action=submission&participantId=${id}`
        );

        const data = await res.json();

        if (data?.ok) {
            let parsed = {};

            if (data.submission?.part1Json) {
                parsed = JSON.parse(data.submission.part1Json);
            }

            setState({
                ...parsed,
                name: data.submission?.name || "",
                email: data.submission?.email || ""
            });
        }

        setLoading(false);
    }

    async function save() {
        // Ekstra sikkerhet: Stopper lagring hvis tidsfristen er ute
        if (erLåst) {
            alert("Tidsfristen for å registrere eller endre svar har utløpt.");
            return;
        }

        let id = participantId.trim();

        if (!id) {
            id = "";
        }

        setLoading(true);

        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "savePartV2",
                part: "part1",
                participantId: id,
                name: state.name,
                email: state.email,
                data: state
            })
        });

        const result = await res.json();
        if (result?.participantId) {
            setParticipantId(result.participantId);
            setInputId(result.participantId);
            setId(result.participantId);
        }
        setLoading(false);
    }

    function updateGroup(group, index, team) {
        const current = state.groups[group] || [];
        const updated = [...current];
        updated[index] = team;

        setState({
            ...state,
            groups: {
                ...state.groups,
                [group]: updated
            }
        });
    }

    function getAvailableTeams(group, pos) {
        const selected = (state.groups[group] || []).filter(
            (team, index) => index !== pos && team
        );
        const currentSelection = (state.groups[group] || [])[pos] || "";


        return GROUPS[group].filter(
            (team) => !selected.includes(team) || team === currentSelection
        );
    }

    // VIS LÅST SKJERM HVIS FRISTEN ER PASSERT
    if (erLåst) {
        return (
            <div style={{ 
                padding: 40, 
                textAlign: "center", 
                fontFamily: "sans-serif",
                marginTop: "10%" 
            }}>
                <h1 style={{ fontSize: "2.5rem", marginBottom: 10 }}>🔒 Konkurransen er stengt</h1>
                <p style={{ fontSize: "1.2rem", color: "#666" }}>
                    Tidsfristen for å levere eller endre svar gikk ut {SPERRE_DATO.toLocaleString("no-NO", { 
                        day: "numeric", 
                        month: "long", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                    })}.
                </p>
                <p style={{ fontSize: "1rem", color: "#888", marginTop: 20 }}>
                    Du kan ikke lenger gjøre endringer i dine tips.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Part 1</h1>

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

            <h2>Navn</h2>
            <input
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
            />

            <h2>E-post</h2>
            <input
                value={state.email}
                onChange={(e) => setState({ ...state, email: e.target.value })}
            />

            {Object.entries(GROUPS).map(([group]) => (
                <div
                    key={group}
                    style={{
                        marginTop: 20,
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 16,
                        boxShadow: "0 6px 18px rgba(17,24,39,0.06)"
                    }}
                >
                    <h3 style={{ marginBottom: 16, fontWeight: 800 }}>Gruppe {group}</h3>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
                            gap: 12
                        }}
                    >
                        {[0, 1, 2, 3].map((pos) => (
                            <div
                                key={pos}
                                style={{
                                    padding: 12,
                                    borderRadius: 12,
                                    backgroundColor: "#f9fafb",
                                    border: "1px solid #e5e7eb"
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 700,
                                        marginBottom: 8,
                                        fontSize: 13,
                                        color: "#374151"
                                    }}
                                >
                                    Plass {pos + 1}
                                </div>


                                <select
                                    value={(state.groups[group] || [])[pos] || ""}
                                    onChange={(e) => updateGroup(group, pos, e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #d1d5db",
                                        backgroundColor: "#ffffff",
                                        fontSize: 14,
                                        color: "#111827"
                                    }}
                                >
                                    <option value="">Velg lag</option>
                                    {getAvailableTeams(group, pos).map((team) => (
                                        <option key={team} value={team}>
                                            {team}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            ))}


            <button onClick={save} style={{ marginTop: 20 }}>
                Lagre
            </button>
        </div>
    );
}