const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  `http://${window.location.hostname || "localhost"}:8080/api/v1`;
const TOKEN_STORAGE_KEY = "futsalcall_auth";

export function readStoredAuth() {
  const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function writeStoredAuth(auth) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiFetch(path, options = {}) {
  const auth = readStoredAuth();
  const headers = {
    "Content-Type": "application/json",
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth();
    }

    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function signup(payload) {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function login(payload) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function googleLogin(payload) {
  return apiFetch("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchVenues() {
  return apiFetch("/admin/venues");
}

export function fetchVisibleVenues() {
  return apiFetch("/venues");
}

export function createVenue(payload) {
  return apiFetch("/admin/venues", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateVenue(venueId, payload) {
  return apiFetch(`/admin/venues/${venueId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteVenue(venueId) {
  return apiFetch(`/admin/venues/${venueId}`, {
    method: "DELETE"
  });
}

export function createGroup(payload) {
  return apiFetch("/groups", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchGroups() {
  return apiFetch("/groups");
}

export function fetchMyGroups() {
  return apiFetch("/groups/mine");
}

export function joinGroup(groupId) {
  return apiFetch(`/groups/${groupId}/join`, {
    method: "POST"
  });
}

export function fetchGroupMembers(groupId) {
  return apiFetch(`/groups/${groupId}/members`);
}

export function fetchGroupJoinRequests(groupId) {
  return apiFetch(`/groups/${groupId}/join-requests`);
}

export function approveGroupMember(groupId, memberId) {
  return apiFetch(`/groups/${groupId}/members/${memberId}/approve`, {
    method: "POST"
  });
}

export function rejectGroupMember(groupId, memberId) {
  return apiFetch(`/groups/${groupId}/members/${memberId}/reject`, {
    method: "POST"
  });
}

export function createEvent(payload) {
  return apiFetch("/admin/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchEvents() {
  return apiFetch("/events");
}

export function expressInterest(eventId, payload) {
  return apiFetch(`/events/${eventId}/interests`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
}

export function fetchEventInterests(eventId) {
  return apiFetch(`/admin/events/${eventId}/interests`);
}

export function deleteEvent(eventId) {
  return apiFetch(`/admin/events/${eventId}`, {
    method: "DELETE"
  });
}

export function applyForLeader() {
  return apiFetch("/users/leader-application", {
    method: "POST"
  });
}

export function fetchMyLeaderApplication() {
  return apiFetch("/users/leader-application");
}

export function fetchLeaderApplications() {
  return apiFetch("/admin/leader-applications");
}

export function approveLeaderApplication(userId) {
  return apiFetch(`/admin/leader-applications/${userId}/approve`, {
    method: "POST"
  });
}

export function rejectLeaderApplication(userId) {
  return apiFetch(`/admin/leader-applications/${userId}/reject`, {
    method: "POST"
  });
}
