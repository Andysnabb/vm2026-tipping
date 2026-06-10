import { API_BASE } from "../config";

export async function getSubmission(participantId) {
    const res = await fetch(
        `${API_BASE}?action=submission&participantId=${encodeURIComponent(participantId)}`,
        {
            method: "GET",
            redirect: "follow"
        }
    );

    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return await res.json();
    }

    const text = await res.text();
    return { ok: false, status: res.status, raw: text };
}

export async function getActuals() {
    try {
        const res = await fetch(`${API_BASE}?action=getActuals`, {
            method: "GET",
            redirect: "follow"
        });

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const json = await res.json();
            return {
                ok: !!json.ok,
                status: res.status,
                data: json.data || null,
                raw: null
            };
        }

        const text = await res.text();
        return {
            ok: false,
            status: res.status,
            data: null,
            raw: text
        };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

export async function saveActual(payload) {
    try {
        const res = await fetch(API_BASE, {
            method: "POST",
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "saveActual",
                password: payload?.password || "",
                data: payload?.data || {}
            })
        });

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const json = await res.json();
            return {
                ok: !!json.ok,
                status: res.status,
                data: json,
                raw: null
            };
        }

        const text = await res.text();
        return {
            ok: false,
            status: res.status,
            data: null,
            raw: text
        };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

export async function savePart(payload) {
    try {
        const res = await fetch(API_BASE, {
            method: "POST",
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "savePartV2",
                participantId: payload?.participantId || "",
                part: payload?.part || "",
                name: payload?.name || "",
                email: payload?.email || "",
                data: payload?.data || {}
            })
        });

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return await res.json();
        }

        const text = await res.text();
        return { ok: false, status: res.status, raw: text };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}
``
