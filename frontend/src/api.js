export async function apiGet(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (err) {
    throw new Error("Cannot reach the backend server. Is it running?");
  }

  if (!response.ok) {
    throw new Error(`Server error (${response.status}) for ${path}`);
  }

  return response.json();
}

export async function apiPost(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error("Cannot reach the backend server. Is it running?");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Server error (${response.status})`);
  }
  return data;
}