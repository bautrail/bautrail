console.log("REGISTER JS GELADEN");

const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.querySelector("input[type='email']").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Bitte alle Felder ausfuellen!");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    console.log("Server Antwort:", data);

    if (res.ok) {
      alert("Account erstellt! Du kannst dich jetzt einloggen.");

      // 👉 Weiterleitung zum Login
      window.location.href = "login.html";
    } else {
      alert(data.message || "Fehler bei Registrierung");
    }

  } catch (error) {
    console.error(error);
    alert("Server nicht erreichbar!");
  }
});