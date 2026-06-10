import { API_BASE } from "../config";

export async function getSubmission(participantId) {
    const res = await fetch(
        `${API_BASE}?action=submission&participantId=${encodeURIComponent(participantId)}`
    );
    return res.json();
}

export async function getActuals() {
    try {
        const res = await fetch(`${API_BASE}?action=getActuals`);
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const json = await res.json();
            // server returns { ok: true, data: { ... } }
            return { ok: !!json.ok, status: res.status, data: json.data || null, raw: null };
        }
        const text = await res.text();
        return { ok: false, status: res.status, data: null, raw: text };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

export async function saveActual(payload) {
    try {
        // Send JSON body so Apps Script JSON parsing works
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=UTF-8" },
            body: JSON.stringify({ action: "saveActual", password: payload.password || "", data: payload.data || {} })
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await res.json();
            return { ok: !!data.ok, status: res.status, data, raw: null };
        }

        const text = await res.text();
        return { ok: false, status: res.status, data: null, raw: text };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

export async function savePart(payload) {
    const body = new URLSearchParams();
    body.append("action", "savePartV2");
    body.append("participantId", payload.participantId || "");
    body.append("part", payload.part || "");
    body.append("name", payload.name || "");
    body.append("email", payload.email || "");
    body.append("data", JSON.stringify(payload.data || {}));

    const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString()
    });

    return res.json();
} 