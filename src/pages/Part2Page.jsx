

import { useEffect, useState } from "react";
import { getSubmission, savePart } from "../lib/api";
// Part2Page component

const SCORERS = [
    "Álvarez (ARG)",
    "Balogun (USA)",
    "Dembélé (FRA)",
    "Depay (NED)",
    "Haaland (NOR)",
    "Kane (ENG)",
    "Lukaku (BEL)",
    "Martínez (ARG)",
    "Mbappé (FRA)",
    "Messi (ARG)",
    "Oyarzabal (ESP)",
    "Pulisic (USA)",
    "Raphinha (BRA)",
    "Rashford (ENG)",
    "Ronaldo (POR)",
    "Saka (ENG)",
    "Torres (ESP)",
    "Vinícius Jr. (BRA)",
    "Woltemade (GER)",
    "Yamal (ESP)",
    "(en annen)",
];

const TEAMS = [
    "Algerie", "Argentina", "Australia", "Belgia", "Bosnia-Hercegovina", "Brasil",
    "Canada", "Colombia", "Curacao", "DR Kongo", "Ecuador", "Egypt", "Elfenbenskysten",
    "England", "Frankrike", "Ghana", "Haiti", "Irak", "Iran", "Japan", "Jordan",
    "Kapp Verde", "Kroatia", "Marokko", "Mexico", "Nederland", "New Zealand",
    "Norge", "Panama", "Paraguay", "Portugal", "Qatar", "Saudi-Arabia", "Senegal",
    "Skottland", "Spania", "Sveits", "Sverige", "Sør-Afrika", "Sør-Korea",
    "Tsjekkia", "Tunisia", "Tyrkia", "Tyskland", "Uruguay", "USA", "Usbekistan", "Østerrike"
];

const TOTAL_GOALS_OPTIONS = [
    "250 el. færre",
    "251-275",
    "276-305",
    "306-330",
    "331 el. flere",
];

const HUB_OPTIONS = ["H", "U", "B"];

const EMPTY_ANSWERS = {
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
    m3: "",
};

export default function Part2Page() {
    const [participantId, setParticipantId] = useState(
        localStorage.getItem("participantId") || ""
    );
    const [answers, setAnswers] = useState(EMPTY_ANSWERS);
    const [message, setMessage] = useState("");


    function update(field, value) {
        setAnswers(prev => ({
            ...prev,
            [field]: value
        }));
    }

    async function loadSaved(id = participantId) {
        if (!id) return;

        try {
            const res = await getSubmission(id);
            if (res.ok && res.submission.part2Json) {
                setAnswers(JSON.parse(res.submission.part2Json));
            }
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        (async () => {
            if (!participantId) return;
            try {
                await loadSaved(participantId);
            } catch (err) {
                console.error(err);
            }
        })();
    }, [participantId]);

    async function handleSubmit() {
        setMessage("");

        if (!participantId) {
            setMessage("Skriv inn deltaker-ID");
            return;
        }

        const hasEmpty = Object.values(answers).some(v => v === "");
        if (hasEmpty) {
            setMessage("Fyll ut alle spørsmål og kamper");
            return;
        }

        if (Number(answers.q2) < 0 || Number(answers.q5) < 0) {
            setMessage("Tall kan ikke være negative");
            return;
        }

        try {
            const res = await savePart({
                participantId,
                part: "part2",
                data: answers
            });

            if (res.ok) {
                setMessage("Del 2 lagret");
            } else {
                setMessage(res.error || "Feil ved lagring");
            }
        } catch {
            setMessage("Feil ved lagring");
        }
    }

    return (
        <div style={{ maxWidth: 760 }}>
            <h2>Del 2 – Spørsmål og kamptips</h2>

            <label style={{ display: "block", marginBottom: 16 }}>
                <div>Deltaker-ID</div>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        value={participantId}
                        onChange={e => setParticipantId(e.target.value)}
                        style={{ flex: 1, padding: 8 }}
                    />
                    <button onClick={() => loadSaved()}>Hent lagret</button>
                </div>
            </label>

            <label>
                <div>1. Hvem av disse scorer flest mål i VM 2026?</div>
                <select value={answers.q1} onChange={e => update("q1", e.target.value)}>
                    <option value="">Velg</option>
                    {SCORERS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </label>

            <label>
                <div>2. Hvor mange mål scorer VMs toppscorer?</div>
                <input type="number" min="0" max="10" value={answers.q2} onChange={e => update("q2", e.target.value)} />
            </label>

            <label>
                <div>3. Hvilket lag scorer flest mål?</div>
                <select value={answers.q3} onChange={e => update("q3", e.target.value)}>
                    <option value="">Velg</option>
                    {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </label>

            <label>
                <div>4. Hvilket lag slipper inn flest mål?</div>
                <select value={answers.q4} onChange={e => update("q4", e.target.value)}>
                    <option value="">Velg</option>
                    {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </label>

            <label>
                <div>5. Hvor mange mål scores i finalen?</div>
                <input type="number" min="0" max="10" value={answers.q5} onChange={e => update("q5", e.target.value)} />
            </label>

            <label>
                <div>6. Hvor mange mål scores totalt i VM?</div>
                <select value={answers.q6} onChange={e => update("q6", e.target.value)}>
                    <option value="">Velg</option>
                    {TOTAL_GOALS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </label>

            <label>
                <div>7. Hvilket lag gjør det best av Tyskland og Frankrike?</div>
                <select value={answers.q7} onChange={e => update("q7", e.target.value)}>
                    <option value="">Velg</option>
                    <option value="Tyskland">Tyskland</option>
                    <option value="Frankrike">Frankrike</option>
                </select>
            </label>

            <label>
                <div>8. Hvilket lag får flest gule kort?</div>
                <select value={answers.q8} onChange={e => update("q8", e.target.value)}>
                    <option value="">Velg</option>
                    {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </label>

            <label>
                <div>9. Hvilket lag får det første røde kortet?</div>
                <select value={answers.q9} onChange={e => update("q9", e.target.value)}>
                    <option value="">Velg</option>
                    {TEAMS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </label>

            <div>
                <div>10. Brasil - Haiti</div>
                <div style={{ display: "flex", gap: 10 }}>
                    <select value={answers.q10_brazil} onChange={e => update("q10_brazil", e.target.value)}>
                        <option value="">Brasil</option>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>

                    <span>-</span>

                    <select value={answers.q10_haiti} onChange={e => update("q10_haiti", e.target.value)}>
                        <option value="">Haiti</option>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
            </div>

            <h3>Kamper</h3>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 20
                }}
            >
                {[
                    { key: "m1", label: "Kroatia - England" },
                    { key: "m2", label: "Tyskland - Elfenbenskysten" },
                    { key: "m3", label: "Uruguay - Spania" }
                ].map((match) => (
                    <div
                        key={match.key}
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 16,
                            padding: 12,
                            boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
                            width: 240
                        }}
                    >
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                marginBottom: 8,
                                color: "#374151"
                            }}
                        >
                            {match.label}
                        </div>
                        {HUB_OPTIONS.map((v) => {
                            const checked = answers[match.key] === v;

                            return (
                                <label
                                    key={v}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "6px 8px",
                                        marginBottom: 6,
                                        borderRadius: 10,
                                        backgroundColor: checked ? "#ecfdf5" : "#f9fafb",
                                        border: checked ? "1px solid #86efac" : "1px solid transparent",
                                        cursor: "pointer"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name={match.key}
                                        checked={checked}
                                        onChange={() => update(match.key, v)}
                                    />
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            color: checked ? "#166534" : "#111827"
                                        }}
                                    >
                                        {v}
                                    </span>
                                    {checked && (
                                        <span
                                            style={{
                                                marginLeft: "auto",
                                                backgroundColor: "#16a34a",
                                                color: "white",
                                                borderRadius: 999,
                                                padding: "2px 8px",
                                                fontSize: 11,
                                                fontWeight: 700
                                            }}
                                        >
                                            Valgt
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                ))}
            </div>
            <button onClick={handleSubmit}>Lagre del 2</button>

            {message && <p>{message}</p>}


        </div>
    );
}
