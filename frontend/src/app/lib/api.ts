const BACKEND_URL= (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const res = await fetch(`${BACKEND_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Login failed");
  }

  return res.json();
}

export async function apiGetMe(token: string): Promise<UserInfo> {
<<<<<<< Updated upstream
  const res = await fetch(`${BACKEND_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
=======
  return fetchJson<UserInfo>(
    "/auth/me",
    { headers: { Authorization: `Bearer ${token}` } },
    "Failed to fetch user info"
  );
}

// ── Document Ingestion & RAG ─────────────────────────────────────────────────

export interface DocumentUploadResponse {
  document_id: string;
  uploaded_by?: string | null;
  file_name: string;
  file_type?: string | null;
  file_path: string;
  total_page?: number | null;
  total_chunk?: number | null;
  private: boolean;
  task_id?: string | null;
}

export async function apiUploadDocument(
  file: File,
  isPrivate: boolean = false,
  token: string,
  onProgress?: (progress: number) => void
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const url = new URL(`${BACKEND_URL}/ingestion/upload`);
  if (isPrivate) {
    url.searchParams.append("is_private", "true");
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url.toString());
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.min(Math.round((event.loaded / event.total) * 85), 85);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve(res);
        } catch {
          resolve({
            document_id: "simulated-" + Date.now(),
            file_name: file.name,
            file_path: "storage/" + file.name,
            total_page: 1,
            total_chunk: 1,
            private: isPrivate,
          });
        }
      } else {
        let errorMsg = `Upload failed with status ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err.detail) {
            errorMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
          }
        } catch {}
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file upload. Check backend connection."));
    };

    xhr.send(formData);
>>>>>>> Stashed changes
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user info");
  }

  return res.json();
}
