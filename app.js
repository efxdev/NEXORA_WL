const SUPABASE_URL = "https://mhkhckiqpxgbpaaslqga.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u3M4IzCLppREM9LzMziTeA_6cnKJXmN";
const CAMPAIGN_BASELINE = 1500;


/* ===============================
   SUPABASE REQUEST
================================ */

async function api(path, options = {}) {

    const response = await fetch(
        SUPABASE_URL + path,
        {
            method: options.method || "GET",

            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + SUPABASE_ANON_KEY,
                "Content-Type": "application/json",

                ...(options.headers || {})
            },

            body: options.body || null
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error("SUPABASE ERROR:", response.status, errorText);

        throw new Error(errorText);
    }

    return response;
}


/* ===============================
   GET REFERRAL CODE
================================ */

function getRef() {

    const params = new URLSearchParams(window.location.search);

    return params.get("ref") || "";
}


/* ===============================
   GENERATE REFERRAL CODE
================================ */

function generateReferralCode() {

    return "NEX" +
        Date.now().toString(36).toUpperCase() +
        Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase();
}


/* ===============================
   VALIDATE EVM WALLET
================================ */

function isValidEVM(address) {

    return /^0x[a-fA-F0-9]{40}$/.test(address);
}


/* ===============================
   MASK WALLET
================================ */

function maskWallet(wallet) {

    if (!wallet) return "Anonymous";

    return (
        wallet.substring(0, 6) +
        "••••" +
        wallet.substring(wallet.length - 4)
    );
}


/* ===============================
   RENDER TASKS
================================ */

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
                    href="${task.link}"
                    target="_blank"
                    rel="noopener"
                >
                    COMPLETE TASK →
                </a>

            </article>
        `)
        .join("");
}


/* ===============================
   APPLICATION COUNT
================================ */

async function loadStats() {

    const countElement =
        document.querySelector("#applicationCount");

    if (!countElement) return;

    try {

        const response = await api(
            "/rest/v1/whitelist_applications?select=id",
            {
                headers: {
                    "Prefer": "count=exact"
                }
            }
        );

        const range =
            response.headers.get("content-range");

        let count = 0;

        if (range && range.includes("/")) {

            count = Number(
                range.split("/")[1]
            );
        }

        countElement.textContent =
            count.toLocaleString();

    } catch (error) {

        console.error("COUNT ERROR:", error);

        countElement.textContent = "LIVE";
    }
}


/* ===============================
   LEADERBOARD
================================ */

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

        if (!rows || rows.length === 0) {

            box.innerHTML =
                `<p class="loading">
                    Leaderboard will appear as applications arrive.
                </p>`;

            return;
        }

        box.innerHTML = rows.map(row => `

            <div class="lb-row">

                <span class="lb-rank">
                    #${row.campaign_rank}
                </span>

                <span>
                    ${maskWallet(row.evm_address)}
                </span>

                <span class="lb-ref">
                    ${row.referral_count || 0} REFERRALS
                </span>

            </div>

        `).join("");

    } catch (error) {

        console.error("LEADERBOARD ERROR:", error);

        box.innerHTML =
            `<p class="loading">
                Leaderboard unavailable.
            </p>`;
    }
}


/* ===============================
   PROGRESS
================================ */

function updateProgress(referrals) {

    const refCount =
        document.querySelector("#refCount");

    const progressBar =
        document.querySelector("#progressBar");

    const nextBoost =
        document.querySelector("#nextBoost");

    if (!refCount || !progressBar || !nextBoost) return;


    const milestones = [10, 50, 100, 250];

    let previous = 0;

    let next = 10;

    for (const milestone of milestones) {

        if (referrals < milestone) {

            next = milestone;

            break;
        }

        previous = milestone;
    }


    let percent = 100;

    if (referrals < 250) {

        percent =
            ((referrals - previous) /
                (next - previous)) * 100;
    }


    percent =
        Math.max(0, Math.min(100, percent));


    refCount.textContent =
        referrals + " VALID REFERRALS";

    progressBar.style.width =
        percent + "%";


    if (referrals >= 250) {

        nextBoost.textContent =
            "ELITE BOOST UNLOCKED";

    } else {

        nextBoost.textContent =
            (next - referrals) +
            " MORE REFERRALS TO NEXT MILESTONE";
    }
}


/* ===============================
   SUBMIT APPLICATION
================================ */

async function handleSubmit(event) {

    event.preventDefault();

    console.log("NEXORA SUBMIT STARTED");


    const form = event.currentTarget;

    const email =
        document.querySelector("#email").value
            .trim()
            .toLowerCase();

    const twitter =
        document.querySelector("#twitter").value
            .trim();

    const telegram =
        document.querySelector("#telegram").value
            .trim();

    const wallet =
        document.querySelector("#wallet").value
            .trim();


    const submitButton =
        form.querySelector('button[type="submit"]');


    /* VALIDATION */

    if (!email || !twitter || !telegram || !wallet) {

        alert("Please complete all required fields.");

        return;
    }


    if (!isValidEVM(wallet)) {

        alert(
            "Please enter a valid EVM wallet address."
        );

        return;
    }


    /* LOADING STATE */

    submitButton.disabled = true;

    submitButton.textContent =
        "VERIFYING APPLICATION...";


    try {


        /* ==========================
           CHECK DUPLICATE EMAIL
        ========================== */

        const duplicateResponse =
            await api(
                "/rest/v1/whitelist_applications" +
                "?email=eq." +
                encodeURIComponent(email) +
                "&select=id" +
                "&limit=1"
            );


        const duplicates =
            await duplicateResponse.json();


        if (duplicates.length > 0) {

            throw new Error(
                "DUPLICATE_APPLICATION"
            );
        }


        /* ==========================
           CREATE APPLICATION
        ========================== */

        const referralCode =
            generateReferralCode();

        const referredBy =
            getRef() || null;


        const payload = {

            email: email,

            twitter_username: twitter,

            telegram_username: telegram,

            evm_address: wallet,

            referral_code: referralCode,

            referred_by: referredBy,

            referral_count: 0
        };


        console.log(
            "INSERTING APPLICATION"
        );


        const insertResponse =
            await api(
                "/rest/v1/whitelist_applications",
                {
                    method: "POST",

                    headers: {
                        "Prefer":
                            "return=representation"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        const savedRows =
            await insertResponse.json();


        const saved =
            Array.isArray(savedRows)
                ? savedRows[0]
                : savedRows;


        console.log(
            "APPLICATION SAVED:",
            saved
        );


        if (!saved) {

            throw new Error(
                "SAVE_RESPONSE_EMPTY"
            );
        }


        /* ==========================
           SUCCESS UI
        ========================== */

        const applySection =
            document.querySelector("#apply");

        const successSection =
            document.querySelector("#success");


        /* FIRST SHOW SUCCESS */

        successSection.classList.remove("hidden");

        successSection.style.display = "block";

        successSection.style.opacity = "1";

        successSection.style.visibility = "visible";


        /* THEN HIDE FORM */

        applySection.style.display = "none";


        /* RANK */

        const rank =
            saved.campaign_rank ||
            CAMPAIGN_BASELINE + 1;


        document.querySelector("#rankResult")
            .textContent = "#" + rank;


        /* REFERRAL LINK */

        const referralLink =
            window.location.origin +
            window.location.pathname +
            "?ref=" +
            encodeURIComponent(
                saved.referral_code
            );


        document.querySelector("#refLink")
            .textContent = referralLink;


        /* PROGRESS */

        updateProgress(
            saved.referral_count || 0
        );


        /* COPY BUTTON */

        const copyButton =
            document.querySelector("#copyRef");


        copyButton.onclick = async () => {

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

                alert(
                    "Please copy the referral link manually."
                );
            }
        };


        /* UPDATE DATA */

        loadStats();

        loadLeaderboard();


        /* SCROLL */

        setTimeout(() => {

            successSection.scrollIntoView({

                behavior: "smooth",

                block: "center"

            });

        }, 200);


    } catch (error) {


        console.error(
            "SUBMIT ERROR:",
            error
        );


        if (
            error.message.includes(
                "DUPLICATE_APPLICATION"
            )
        ) {

            alert(
                "This email has already submitted an application."
            );

        } else {

            alert(
                "Application could not be submitted.\n\n" +
                error.message
            );
        }


        /* RESET BUTTON */

        submitButton.disabled = false;

        submitButton.textContent =
            "SUBMIT WHITELIST APPLICATION →";
    }
}


/* ===============================
   INITIALIZE
================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "NEXORA INITIALIZED"
        );


        renderTasks();

        loadStats();

        loadLeaderboard();

        updateProgress(0);


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
                handleSubmit
            );
        }
    }
);
