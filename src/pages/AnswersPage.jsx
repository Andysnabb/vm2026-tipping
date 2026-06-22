import { useEffect, useState } from "react";

//const API_URL = import.meta.env.VITE_API_URL;
import { API_BASE } from "../config";

export default function AnswersPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("part1");

    // Ny state for fasit (Del 1 + Del 2 + Del 3)
    const [actual, setActual] = useState(null);
    
    // Om fasit ikke kunne hentes
    const [actualError, setActualError] = useState(false);
    
    // Om fasit fortsatt lastes
    const [loadingActual, setLoadingActual] = useState(true);

    // 1. SETT TIDSPUNKTET FOR NÅR SIDEN SKAL ÅPNES HER
    // Format: ÅÅÅÅ-MM-DDTHH:MM:SS (f.eks. 15. juli kl. 18:00)
    const LANSERINGS_DATO = new Date("2026-06-11T21:00:00");
    const nå = new Date();
    const erLåst = nå < LANSERINGS_DATO;

    const labels = {
        q1: "Toppscorer",  
        q2: "Ant. mål for toppscorer",
        q3: "Mestscorende lag",
        q4: "Flest mål imot",
        q5: "Ant. mål i finalen",
        q6: "Ant. mål i VM",
        q7: "Best av GER vs. FRA",
        q8: "Flest gule kort",
        q9: "Første røde kort",
        q10: "Resultat Brasil - Haiti",
        m1: "CRO - ENG",
        m2: "GER - IVO",
        m3: "URU - SPA",
    };

    useEffect(() => {
        async function load() {
            if (erLåst) {
                setLoading(false);
                return;
            }
    
            if (!API_BASE) return;
    
            setLoading(true);
            setLoadingActual(true);
    
            try {
                // 1. Hent submissions
                const res = await fetch(`${API_BASE}?action=all`);
                const result = await res.json();
    
                if (result.ok) {
                    setData(result.data);
                }
    
                // 2. Hent fasit for Del 2 (Sheets)
                const actualsRes = await fetch(`${API_BASE}?action=actuals`)
                    .then(r => r.json())
                    .catch(() => null);
    
                // 3. Hent live-data for Del 1 + Del 3
                const liveRes = await fetch(`${API_BASE}?action=liveParsed`)
                    .then(r => r.json())
                    .catch(() => null);
    
                const bracketRes = await fetch(`${API_BASE}?action=liveBracketParsed`)
                    .then(r => r.json())
                    .catch(() => null);
                            
                console.log("ACTUALS RES:", actualsRes);
                console.log("LIVE RES:", liveRes);
                console.log("BRACKET RES:", bracketRes);
                            
                if (!actualsRes?.ok || !liveRes?.ok || !bracketRes?.ok) {
                    setActualError(true);
                    setActual(null);
                } else {
                    setActual({
                        groups: liveRes.data.groups || {},
                        part2: actualsRes.data.part2 || {},
                        knockout: bracketRes.data.knockout || {}
                    });
                }
            } catch (err) {
                setActualError(true);
                setActual(null);
            }
    
            setLoading(false);
            setLoadingActual(false);
        }
    
        load();
    }, [erLåst]);

    if (loading) {
        return <div>Laster...</div>;
    }

    // 2. VIS DENNE SKJERMEN HVIS TIDEN IKKE HAR PASSERT ENDA
    if (erLåst) {
        return (
            <div style={{ 
                padding: 40, 
                textAlign: "center", 
                fontFamily: "sans-serif",
                marginTop: "10%" 
            }}>
                <h1 style={{ fontSize: "2.5rem", marginBottom: 10 }}>🔒 Svarene er låst</h1>
                <p style={{ fontSize: "1.2rem", color: "#666" }}>
                    Resultatene og deltakernes svar blir tilgjengelige her så snart tidsfristen har gått ut.
                </p>
                <div style={{ 
                    display: "inline-block", 
                    marginTop: 20, 
                    padding: "10px 20px", 
                    background: "#f5f5f5", 
                    borderRadius: 8,
                    fontWeight: "bold",
                    border: "1px solid #ddd"
                }}>
                    Åpner: {LANSERINGS_DATO.toLocaleString("no-NO", { 
                        day: "numeric", 
                        month: "long", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                    })}
                </div>
            </div>
        );
    }

    // 3. HVIS TIDEN ER INNE, VISES HELE SIDEN SOM VANLIG UNDER HER
    return (
        <div style={{ padding: 20 }}>
            <h1>Alle svar</h1>
            {actualError && (
                <div style={{
                    padding: 10,
                    background: "#fff3cd",
                    border: "1px solid #ffeeba",
                    borderRadius: 6,
                    marginBottom: 20,
                    color: "#856404",
                    fontWeight: "bold"
                }}>
                    Fasit er ikke tilgjengelig akkurat nå. Markeringer er deaktivert.
                </div>
            )}

                <div style={{ marginBottom: 20 }}>

                    <button
                        onClick={() => setView("part1")}
                        
                    style={{
                        marginLeft: 10,
                        padding: "8px 14px",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                        background: view === "part1" ? "#333" : "#fff",
                        color: view === "part1" ? "#fff" : "#000",
                        cursor: "pointer"
                    }}

                    >
                        Del 1
                    </button>

                    <button
                        onClick={() => setView("part2")}
                        
                    style={{
                        marginLeft: 10,
                        padding: "8px 14px",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                        background: view === "part2" ? "#333" : "#fff",
                        color: view === "part2" ? "#fff" : "#000",
                        cursor: "pointer"
                    }}

                    >
                        Del 2
                    </button>

                    <button
                        onClick={() => setView("part3")}
                        
                    style={{
                        marginLeft: 10,
                        padding: "8px 14px",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                        background: view === "part3" ? "#333" : "#fff",
                        color: view === "part3" ? "#fff" : "#000",
                        cursor: "pointer"
                    }}

                    >
                        Del 3
                    </button>

                </div>

                {view === "part1" && (
                  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((group) => (
                    <div key={group} style={{ marginBottom: 30 }}>
                      <h2>Gruppe {group}</h2>
                
                      <div className="table-scroll">
                        <table className="answers-table">
                          <thead>
                            <tr>
                              <th style={{ border: "1px solid #ccc", padding: 2, width: 20 }}></th>
                              {data.map((row) => (
                                <th
                                  key={row.participantId}
                                  style={{
                                    border: "1px solid #ccc",
                                    padding: 6,
                                    wordBreak: "break-word"
                                  }}
                                >
                                  {row.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                
                          <tbody>
                            {[0, 1, 2, 3].map((pos) => (
                              <tr key={pos}>
                                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                                  {pos + 1}
                                </td>
                
                                {data.map((row) => {
                                  const part1 = row.part1Json
                                    ? JSON.parse(row.part1Json)
                                    : null;
                
                                  return (
                                    <td
                                      key={row.participantId + pos}
                                      style={{
                                        border: "1px solid #ccc",
                                        padding: 6,
                                        wordBreak: "break-word"
                                      }}
                                    >
                                      {part1 &&
                                      part1.groups &&
                                      part1.groups[group] &&
                                      part1.groups[group][pos]
                                        ? part1.groups[group][pos]
                                        : ""}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}

            {view === "part2" && (
              <div>
                <h2>Del 2</h2>
            
                <div className="table-scroll">
                  <table className="answers-table">
                    <thead>
                      <tr>
                        <th style={{ border: "1px solid #ccc", padding: 8, width: 100 }}>
                          Spm.
                        </th>
            
                        {data.map((row) => (
                          <th
                            key={row.participantId}
                            style={{
                              border: "1px solid #ccc",
                              padding: 6,
                              fontWeight: "bold",
                              backgroundColor: "#f5f5f5",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere"
                            }}
                          >
                            {row.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
            
                    <tbody>
                      {["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "m1", "m2", "m3"].map(
                        (question) => (
                          <tr key={labels[question] || question}>
                            <td
                              style={{
                                border: "1px solid #ccc",
                                padding: 6,
                                width: 120,
                                fontWeight: "bold",
                                backgroundColor: "#f5f5f5",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere"
                              }}
                            >
                              {labels[question] || question}
                            </td>
            
                            {data.map((row) => {
                              const part2 = row.part2Json ? JSON.parse(row.part2Json) : null;
            
                              return (
                                <td
                                  key={row.participantId + question}
                                  style={{
                                    border: "1px solid #ccc",
                                    padding: 4,
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                    fontSize: 13,
                                    lineHeight: 1.2
                                  }}
                                >
                                  {part2
                                    ? question === "q10"
                                      ? `${part2.q10_brazil || ""} - ${part2.q10_haiti || ""}`
                                      : part2[question] || ""
                                    : ""}
                                </td>
                              );
                            })}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === "part3" && (
  <div>
    <h2>Del 3</h2>

    <div className="table-scroll">
      <table className="answers-table">
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 6, width: 120 }}>
              Runde
            </th>

            {data.map((row) => (
              <th
                key={row.participantId}
                style={{
                  border: "1px solid #ccc",
                  padding: 6,
                  fontWeight: "bold",
                  backgroundColor: "#f5f5f5",
                  wordBreak: "break-word"
                }}
              >
                {row.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {[
            "roundOf32",
            "roundOf16",
            "quarterfinals",
            "semifinals",
            "bronzeFinal",
            "final"
          ].map((key) => (
            <tr key={key}>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>
                {key === "roundOf32"
                  ? "16-delsfinaler"
                  : key === "roundOf16"
                  ? "8-delsfinaler"
                  : key === "quarterfinals"
                  ? "Kvartfinaler"
                  : key === "semifinals"
                  ? "Semifinaler"
                  : key === "bronzeFinal"
                  ? "Bronsefinale"
                  : "Finale"}
              </td>

              {data.map((row) => {
                const part3 = row.part3Json ? JSON.parse(row.part3Json) : null;

                return (
                  <td
                    key={row.participantId + key}
                    style={{
                      border: "1px solid #ccc",
                      padding: 6,
                      wordBreak: "break-word"
                    }}
                  >
                    {part3 && part3[key]
                      ? Array.isArray(part3[key])
                        ? part3[key].map((team, i) => (
                            <div key={i}>Kamp {i + 1}: {team}</div>
                          ))
                        : part3[key]
                      : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

</div>   
);
}

