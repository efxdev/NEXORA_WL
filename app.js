const SUPABASE_URL = "https://mhkhckiqpxgbpaaslqga.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u3M4IzCLppREM9LzMziTeA_6cnKJXmN";

function getRef() {
  return new URLSearchParams(window.location.search).get("ref") || "";
}

function makeCode() {
  return "NEX" + Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 8).toUpperCase();
}

function validWallet(wallet) {
  return /^0x[a-fA-F0-9]{40}$/.test(wallet);
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(SUPABASE_URL + path, {
    method: options.method || "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body
  });

  const text = await response.text();

  console.log("SUPABASE STATUS:", response.status);
  console.log("SUPABASE RESPONSE:", text);

  if (!response.ok) {
    throw new Error(text || "Supabase request failed");
  }

  return text ? JSON.parse(text) : null;
}


/* SUBMIT */

document.addEventListener("DOMContentLoaded", () => {

  console.log("✅ NEXORA APP LOADED - DEBUG VERSION");

  const form = document.getElementById("whitelistForm");

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');

    const email = document.getElementById("email").value.trim().toLowerCase();
    const twitter = document.getElementById("twitter").value.trim();
    const telegram = document.getElementById("telegram").value.trim();
    const wallet = document.getElementById("wallet").value.trim();

    if (!validWallet(wallet)) {
      alert("Invalid EVM Wallet Address");
      return;
    }

    button.disabled = true;
    button.textContent = "VERIFYING APPLICATION...";

    const code = makeCode();

    const payload = {
      email: email,
      twitter_username: twitter,
      telegram_username: telegram,
      evm_address: wallet,
      referral_code: code,
      referred_by: getRef() || null,
      referral_count: 0
    };

    console.log("🚀 SENDING:", payload);

    try {

      const result = await supabaseRequest(
        "/rest/v1/whitelist_applications",
        {
          method: "POST",
          headers: {
            "Prefer": "return=representation"
          },
          body: JSON.stringify(payload)
        }
      );

      console.log("✅ SUCCESS RESULT:", result);

      /* যদি response আসে */

      let saved = Array.isArray(result) ? result[0] : result;

      /*
        যদি Supabase empty response দেয়,
        referral code দিয়ে record বের করো
      */

      if (!saved) {

        console.log("Searching saved application...");

        const search = await supabaseRequest(
          "/rest/v1/whitelist_applications?select=campaign_rank,referral_code,referral_count&referral_code=eq." +
          encodeURIComponent(code)
        );

        saved = search?.[0];
      }

      if (!saved) {
        throw new Error("Application inserted but record could not be retrieved.");
      }


      console.log("🎉 FINAL SAVED:", saved);


      /* SUCCESS UI */

      document.getElementById("apply").style.display = "none";

      const success = document.getElementById("success");

      success.classList.remove("hidden");

      success.style.display = "block";

      document.getElementById("rankResult").textContent =
        "#" + (saved.campaign_rank || "CONFIRMED");


      const referralLink =
        window.location.origin +
        window.location.pathname +
        "?ref=" +
        encodeURIComponent(saved.referral_code || code);


      document.getElementById("refLink").textContent =
        referralLink;


      const copyButton =
        document.getElementById("copyRef");

      copyButton.onclick = async () => {

        try {

          await navigator.clipboard.writeText(referralLink);

          copyButton.textContent = "COPIED ✓";

          setTimeout(() => {
            copyButton.textContent = "COPY";
          }, 1500);

        } catch {

          alert("Copy this link manually:\n\n" + referralLink);

        }

      };


      document.getElementById("refCount").textContent =
        (saved.referral_count || 0) + " VALID REFERRALS";


      document.getElementById("progressBar").style.width = "0%";


      document.getElementById("nextBoost").textContent =
        "NEXT BOOST UNLOCKS SOON";


      success.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });


    } catch (error) {

      console.error("❌ FINAL ERROR:", error);

      alert(
        "ERROR DETECTED:\n\n" +
        error.message
      );

      button.disabled = false;

      button.textContent =
        "SUBMIT WHITELIST APPLICATION →";

    }

  });

});
