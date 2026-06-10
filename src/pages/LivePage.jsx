/* === LIVE TABLE BASE === */
.live-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}

/* === HEADER === */
.live-table th {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  color: #ffffff;
  font-weight: 700;
  padding: 10px;
  text-align: center;
  font-size: 13px;
}

/* === CELLS === */
.live-table td {
  padding: 10px 8px;
  text-align: center;
  color: #f8fafc;
  font-size: 14px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

/* === TEAM COLUMN (venstrejustert) === */
.live-table td:nth-child(2),
.live-table th:nth-child(2) {
  text-align: left;
}

/* === ROW COLORS (lysere enn før) === */
.live-table tr:nth-child(odd) td {
  background: rgba(71, 85, 105, 0.65);
}

.live-table tr:nth-child(even) td {
  background: rgba(100, 116, 139, 0.65);
}

/* === HOVER EFFECT === */
.live-table tr:hover td {
  background: rgba(59, 130, 246, 0.35);
  transition: background 0.15s ease;
}

/* === FIRST COLUMN (posisjon) === */
.live-table td:first-child,
.live-table th:first-child {
  width: 50px;
  min-width: 50px;
  font-weight: 700;
}

/* === LAST COLUMN (poeng) === */
.live-table td:last-child {
  font-weight: 800;
  color: #93c5fd;
}

/* === TEAM NAME STYLE === */
.live-table td:nth-child(2) {
  font-weight: 600;
  color: #e2e8f0;
}

/* === BONUS: subtle divider === */
.live-table tr {
  transition: all 0.15s ease;
}
