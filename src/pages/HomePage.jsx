export default function HomePage() {
    return (
        <div className="card">
            <h2>VM Tipping 2026</h2>

            <p>
                Velkommen! Bruk menyen for å levere svar på Del 1, Del 2 og Del 3.
            </p>

            <p>
                NB! Etter første lagring får du en <strong>deltaker-ID</strong>.
                Ta vare på denne for å kunne hente frem og endre svarene dine senere.
            </p>

            <hr />

            <h3>Regler</h3>
            <ul>
                <li>Du kan levere ett sett svar per deltaker.</li>
                <li>Du kan redigere svarene dine ved hjelp av deltaker-ID.</li>
                <li>Frist for innlevering settes før turneringsstart.</li>
                <li>Poeng oppdateres fortløpende basert på faktiske resultater.</li>
            </ul>

            <hr />

            <h3>Poengsystem</h3>

            <h4>Del 1 – Gruppespill</h4>
            <ul>
                <li>1 poeng for riktig lag på riktig plass (1–4)</li>
                <li>+2 poeng ekstra for riktig gruppevinner</li>
            </ul>

            <h4>Del 2 – Spørsmål</h4>
            <ul>
                <li>2 poeng per riktig svar</li>
            </ul>

            <h4>Del 3 – Sluttspill</h4>
            <ul>
                <li>+1 poeng per lag riktig i 16-delsfinale</li>
                <li>+2 poeng per lag riktig i 8-delsfinale</li>
                <li>+3 poeng per lag riktig i kvartfinale</li>
                <li>+10 poeng for riktig verdensmester</li>
                <li>+5 poeng for riktig finalist (2. plass)</li>
                <li>+8 poeng hvis finalistene er riktig valgt, men byttet plass</li>
                <li>+3 poeng for bronsevinner</li>
                <li>+3 poeng for 4. plass</li>
            </ul>

            <h3>Forklaring til spørsmålene</h3>
            <h4>Spørsmål 1-6</h4>
            <li>Mål scoret i straffesparkkonkurranser regnes ikke med i noen av spørsmålene</li>
            <li>Mål scoret i ekstraomganger teller</li>
            <li>Selvmål teller i spørsmål 3, 4, 5 og 6 - ikke i spørsmål 1 og 2.</li>
            <h4>Spørsmål 7</h4>
            <p>I utgangspunktet er laget som avanserer lengst det beste laget. Dersom begge lag kommer like langt, beregnes det beste laget slik:</p>
            <li>Laget med flest poeng er det beste (3 poeng for seier, 1 poeng for uavgjort)</li>
            <li>Målforskjell</li>
            <li>Flest scorede mål</li>
            <li>Begge lag er like gode - poeng til begge svaralternativer</li>
            <p>Poeng og målforskjell regnes ut fra ordinær spilletid (90 minutter). Lag som går videre etter ekstraomganger får dermed kun ett poeng.</p>
            <h4>Spørsmål 9</h4>
            <p>Ettersom lagene spiller sine første kamper på forskjellige dager skal dette spørsmålet tolkes som hvilket lag som bruker kortest tid på å få rødt kort i turneringen.</p>
            <p>For eksempel: Om Spania får rødt kort etter 55 minutter den 15. juni og England får rødt kort etter 40 minutter den 16. juni, så er det England som er riktig svar.</p>
            <p>Om ingen av lagene får rødt kort i sin første kamp går spørsmålet videre til kamp nr. 2. Og så videre...</p>
            <p>For alle disputter om regler og poeng, er det FIFAs ofiisielle statistikk som er fasit.</p>
            <hr />

            <h3>Innsats og premier</h3>
            <p>250kr per deltager i innsats.</p>
            <ul>
                <li>1.plass - 65% av premiepott</li>
                <li>2.plass - 25% av premiepott</li>
                <li>3.plass - 10% av premiepott</li>
            </ul>
            <p>Jeg ordner en Vipps-spleis etter VM for å fordele potten på vinnerne.</p>
        </div>
    );
}
