console.log("LOGIN JS GELADEN");

// Warten bis Seite geladen ist
document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("loginForm");

  if (!form) {
    console.error("Form nicht gefunden!");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    console.log("Form wurde abgeschickt");

    const email = document.querySelector("input[type='email']").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);

        console.log("Login erfolgreich");

        window.location.href = "index.html";
      } else {
        alert(data.message);
      }

    } catch (err) {
      console.error(err);
      alert("Server nicht erreichbar");
    }
  });

});