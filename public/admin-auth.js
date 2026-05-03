async function logoutAdmin() {
  await fetch(apiUrl("/api/admin/logout"), {
    method: "POST"
  });

  window.location.href = "/login.html";
}
