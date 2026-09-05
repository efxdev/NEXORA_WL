const SUPABASE_URL = "https://mhkhckiqpxgbpaaslqga.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u3M4IzCLppREM9LzMziTeA_6cnKJXmN";

const CAMPAIGN_BASELINE = 1500;


/* =========================
   HELPERS
========================= */

function maskWallet(v) {
    return v ? `${v.slice(0, 6)}••••${v.slice(-4)}` : "Anonymous";
}

function getRef() {
    return new URLSearchParams(window.location.search).get("ref") || "";
}

function referralCode() {
    return (
        "NEX" +
        crypto.randomUUID()
            .replaceAll("-", "")
            .slice(0, 10)
            .toUpperCase()
    );
}

function evmValid(v) {
    return /^0x[a-fA-F0-9]{40}$/.test(v);
}


/* =========================
   SUPABASE API
========================= */

async function api(path, options = {}) {

    const response = await fetch(
        SUPABASE_URL + path,
        {
            ...options,

            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: "Bearer " + SUPABASE_ANON_KEY,
                "Content-Type": "application/json",

                ...(options.headers || {})
            }
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "SUPABASE ERROR:",
            response.status,
            errorText
        );

        throw new Error(
            `${response.status}: ${errorText}`
        );
    }

    return response;
}


/* =========================
   TASKS
========================= */

function renderTasks() {

    const box = document.querySelector("#tasks");

    if (!box) return;

    const tasks = window.NEXORA_TASKS || [];

    box.innerHTML = tasks
        .filter(task => task.active)
        .map(task => `
            <article class="task">

                <div class="task-icon">
                    ${task.icon}
                </div>

                <h3>${task.title}</h3>

                <p>${task.description}</p>

                <a
                    class="btn primary"
                    target="_blank"
                    rel="noopener"
                    href="${task.link}"
                >
                    COMPLETE TASK →
                </a>

            </article>
        `)
        .join("");
}


/* =========================
   LIVE APPLICATION COUNT
========================= */

async function loadStats() {

    const countEl =
        document.querySelector("#applicationCount");

    if (!countEl) return;

    try {

        const response = await api(
            "/rest/v1/whitelist_applications?select=id",
            {
                headers: {
                    Prefer: "count=exact"
                }
            }
        );

        const range =
            response.headers.get("content-range");

        const count =
            range?.split("/")[1] || "0";

        countEl.textContent =
            Number(count).toLocaleString();

    } catch (error) {

        console.error("Stats error:", error);

        countEl.textContent = "LIVE";
    }
}


/* =========================
   LEADERBOARD
========================= */

async function loadLeaderboard() {

    const box =
        document.querySelector("#leaderboard");

    if (!box) return;

    try {

        const response = await api(
            "/rest/v1/whitelist_applications" +
            "?select=evm_address,referral_count,campaign_rank" +
            "&campaign_rank=not.is.null" +
            "&order=campaign_rank.asc" +
            "&limit=10"
        );

        const rows =
            await response.json();

        if (!rows || !rows.length) {

            box.innerHTML = `
                <p class="loading">
                    Leaderboard will appear as verified applications arrive.
                </p>
            `;

            return;
        }

        box.innerHTML =
            rows.map(row => `

                <div class="lb-row">

                    <span class="lb-rank">
                        #${row.campaign_rank || "—"}
                    </span>

                    <span>
                        ${maskWallet(row.evm_address)}
                    </span>

                    <span class="lb-ref">
                        ${row.referral_count || 0}
                        REFERRALS
                    </span>

                </div>

            `).join("");

    } catch (error) {

        console.error(
            "Leaderboard error:",
            error
        );

        box.innerHTML = `
            <p class="loading">
                Leaderboard is loading...
            </p>
        `;
    }
}


/* =========================
   REFERRAL PROGRESS
========================= */

function progress(refs) {

    const refCountEl =
        document.querySelector("#refCount");

    const progressBar =
        document.querySelector("#progressBar");

    const nextBoost =
        document.querySelector("#nextBoost");


    if (
        !refCountEl ||
        !progressBar ||
        !nextBoost
    ) return;


    const milestones = [10, 50, 100, 250];

    const next =
        milestones.find(x => refs < x) || 250;

    const previous =
        [...milestones]
            .filter(x => x <= refs)
            .pop() || 0;


    const percentage =
        next === previous
            ? 100
            : Math.min(
                100,
                ((refs - previous) /
                (next - previous)) * 100
            );


    refCountEl.textContent =
        `${refs} VALID REFERRALS`;

    progressBar.style.width =
        percentage + "%";


    if (refs >= 250) {

        nextBoost.textContent =
            "ELITE BOOST UNLOCKED";

    } else {

        nextBoost.textContent =
            `${next - refs} MORE REFERRALS TO NEXT MILESTONE`;
    }
}


/* =========================
   SUBMIT APPLICATION
========================= */

async function submit(event) {

    event.preventDefault();


    const form = event.target;

    const emailEl =
        document.querySelector("#email");

    const twitterEl =
        document.querySelector("#twitter");

    const telegramEl =
        document.querySelector("#telegram");

    const walletEl =
        document.querySelector("#wallet");


    if (
        !emailEl ||
        !twitterEl ||
        !telegramEl ||
        !walletEl
    ) {

        alert(
            "Form configuration error. Please refresh and try again."
        );

        return;
    }


    const email =
        emailEl.value.trim().toLowerCase();

    const twitter =
        twitterEl.value.trim();

    const telegram =
        telegramEl.value.trim();

    const wallet =
        walletEl.value.trim();


    const button =
        form.querySelector("button[type='submit']") ||
        form.querySelector("button");


    /* VALIDATION */

    if (!email) {

        alert("Please enter your email address.");

        return;
    }


    if (!twitter) {

        alert("Please enter your X / Twitter username.");

        return;
    }


    if (!telegram) {

        alert("Please enter your Telegram username.");

        return;
    }


    if (!evmValid(wallet)) {

        alert(
            "Please enter a valid EVM wallet address.\n\nExample:\n0x1234567890abcdef1234567890abcdef12345678"
        );

        return;
    }


    /* LOADING */

    if (button) {

        button.disabled = true;

        button.textContent =
            "VERIFYING APPLICATION...";
    }


    const code = referralCode();

    const ref =
        getRef() || null;


    const payload = {

        email: email,

        twitter_username: twitter,

        telegram_username: telegram,

        evm_address: wallet,

        referral_code: code,

        referred_by: ref,

        referral_count: 0
    };


    console.log(
        "Submitting application:",
        payload
    );


    try {


        /* =========================
           INSERT APPLICATION
        ========================= */

        const response = await api(
            "/rest/v1/whitelist_applications",
            {
                method: "POST",

                headers: {
                    Prefer:
                        "return=representation"
                },

                body:
                    JSON.stringify(payload)
            }
        );


        let savedRows = [];


        try {

            savedRows =
                await response.json();

        } catch (jsonError) {

            console.warn(
                "Insert succeeded but JSON response could not be parsed.",
                jsonError
            );
        }


        let saved =
            Array.isArray(savedRows)
                ? savedRows[0]
                : savedRows;


        /* =========================
           FALLBACK:
           FETCH THE SAVED ROW
        ========================= */

        if (!saved || !saved.campaign_rank) {

            console.log(
                "Fetching saved application..."
            );

            const lookupResponse =
                await api(
                    "/rest/v1/whitelist_applications" +
                    "?select=campaign_rank,referral_code,referral_count" +
                    "&referral_code=eq." +
                    encodeURIComponent(code) +
                    "&limit=1"
                );


            const lookupRows =
                await lookupResponse.json();


            if (
                lookupRows &&
                lookupRows.length
            ) {

                saved =
                    lookupRows[0];
            }
        }


        /* =========================
           CONFIRM SUCCESS
        ========================= */

        if (!saved) {

            throw new Error(
                "Application was submitted but the saved record could not be retrieved."
            );
        }


        console.log(
            "APPLICATION SUCCESS:",
            saved
        );


        /* =========================
           HIDE FORM
        ========================= */

        const applySection =
            form.closest(".apply-section");

        if (applySection) {

            applySection.classList.add(
                "hidden"
            );

        } else {

            form.classList.add(
                "hidden"
            );
        }


        /* =========================
           SHOW SUCCESS SCREEN
        ========================= */

        const success =
            document.querySelector("#success");


        if (success) {

            success.classList.remove(
                "hidden"
            );


            setTimeout(() => {

                success.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }, 100);
        }


        /* =========================
           SHOW RANK
        ========================= */

        const rankResult =
            document.querySelector("#rankResult");


        const rank =
            saved.campaign_rank ||
            CAMPAIGN_BASELINE + 1;


        if (rankResult) {

            rankResult.textContent =
                "#" + rank;
        }


        /* =========================
           REFERRAL LINK
        ========================= */

        const referralLink =
            window.location.origin +
            window.location.pathname +
            "?ref=" +
            encodeURIComponent(
                saved.referral_code || code
            );


        const refLinkEl =
            document.querySelector("#refLink");


        if (refLinkEl) {

            refLinkEl.textContent =
                referralLink;
        }


        /* =========================
           COPY BUTTON
        ========================= */

        const copyButton =
            document.querySelector("#copyRef");


        if (copyButton) {

            copyButton.onclick =
                async function () {

                    try {

                        await navigator.clipboard.writeText(
                            referralLink
                        );

                        copyButton.textContent =
                            "COPIED ✓";


                        setTimeout(() => {

                            copyButton.textContent =
                                "COPY";

                        }, 1500);

                    } catch (error) {

                        console.error(
                            "Clipboard error:",
                            error
                        );

                        alert(
                            "Copy failed. Please copy the referral link manually."
                        );
                    }
                };
        }


        /* =========================
           UPDATE UI
        ========================= */

        progress(
            saved.referral_count || 0
        );


        loadStats();

        loadLeaderboard();


    } catch (error) {


        console.error(
            "APPLICATION SUBMISSION ERROR:",
            error
        );


        let message =
            "Application could not be submitted. Please try again.";


        const errorText =
            String(error.message).toLowerCase();


        if (
            errorText.includes("duplicate") ||
            errorText.includes("unique")
        ) {

            message =
                "Duplicate application detected. Each participant may submit only once.";

        } else if (
            errorText.includes("referral_code")
        ) {

            message =
                "A referral system error occurred. Please try again.";

        } else {

            /* Temporary debugging */
            console.log(
                "FULL ERROR:",
                error.message
            );
        }


        alert(message);


    } finally {


        if (button) {

            button.disabled = false;

            button.textContent =
                "SUBMIT WHITELIST APPLICATION →";
        }
    }
}


/* =========================
   INITIALIZE
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "NEXORA APP INITIALIZED"
        );


        renderTasks();

        loadStats();

        loadLeaderboard();


        const referrer =
            document.querySelector("#referrer");


        if (referrer) {

            referrer.value =
                getRef();
        }


        const form =
            document.querySelector("#whitelistForm");


        if (form) {

            form.addEventListener(
                "submit",
                submit
            );

        } else {

            console.error(
                "ERROR: #whitelistForm not found!"
            );
        }


        progress(0);
    }
);
