const BASE_URL = "http://localhost:8080/api/users";

type Role = "STUDENT" | "MENTOR";

type RegisterPayload = {
  email: string;
  password: string;
  role: Role;
};

type LoginPayload = {
  email: string;
  password: string;
};

export type UserResponse = {
  email: string;
  role: string;
};

async function parseResponse(res: Response) {
  if (res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.includes("application/json")
      ? res.json()
      : res.text();
  }

  let message = "Something went wrong. Please try again.";

  try {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } else {
      const text = await res.text();
      if (text) {
        message = text;
      }
    }
  } catch {
    // Fall back to the default message when the server response is not parseable.
  }

  if (res.status === 401) {
    message = message === "Something went wrong. Please try again."
      ? "Your session is invalid or has expired."
      : message;
  }

  if (res.status === 403) {
    message = message === "Something went wrong. Please try again."
      ? "This account is not allowed to view the users API."
      : message;
  }

  throw new Error(message);
}

export async function registerUser(data: RegisterPayload) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseResponse(res);
}

export async function loginUser(data: LoginPayload) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parseResponse(res);
}

export async function getUsers(token: string) {
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse(res) as Promise<UserResponse[]>;
}
