import { getCookie, setCookie, deleteCookie } from "cookies-next";

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const fullUrl = url.startsWith("http") ? url : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;

  let token = getCookie("token");

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // First request attempt
  let response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // If 401 Unauthorized, attempt refresh token rotation and single retry
  if (response.status === 401) {
    const refreshToken = getCookie("refresh_token");
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setCookie("token", data.access_token);
          setCookie("refresh_token", data.refresh_token);

          // Retry original request once with new token
          headers.set("Authorization", `Bearer ${data.access_token}`);
          response = await fetch(fullUrl, {
            ...options,
            headers,
          });
          return response;
        }
      } catch (e) {
        console.error("Token refresh network error:", e);
      }
    }

    // Refresh failed or no refresh token: clear credentials and redirect to login
    deleteCookie("token");
    deleteCookie("refresh_token");
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
}
