import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyForLeader,
  approveGroupMember,
  approveLeaderApplication,
  clearStoredAuth,
  createEvent,
  createGroup,
  createVenue,
  deleteEvent,
  deleteVenue,
  expressInterest,
  fetchEventInterests,
  fetchEvents,
  fetchGroupJoinRequests,
  fetchGroupMembers,
  fetchGroups,
  fetchLeaderApplications,
  fetchMyGroups,
  fetchMyLeaderApplication,
  fetchVenues,
  fetchVisibleVenues,
  googleLogin,
  joinGroup,
  login,
  readStoredAuth,
  rejectGroupMember,
  rejectLeaderApplication,
  signup,
  updateEvent,
  updateVenue,
  writeStoredAuth
} from "./api";

const NAV_ITEMS = [
  { key: "dashboard", label: "Home", icon: "H" },
  { key: "events", label: "Events", icon: "E" },
  { key: "groups", label: "Groups", icon: "G" },
  { key: "venues", label: "Venues", icon: "V" },
  { key: "settings", label: "Settings", icon: "S" }
];

const DEFAULT_GROUP_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const INITIAL_VENUE_FORM = {
  groupId: DEFAULT_GROUP_ID,
  name: "",
  address: "",
  mapUrl: "",
  latitude: "",
  longitude: "",
  isActive: true
};

const INITIAL_EVENT_FORM = {
  groupId: DEFAULT_GROUP_ID,
  venueId: "",
  title: "",
  description: "",
  date: "",
  startClock: "",
  endClock: "",
  maxPlayers: 14,
  requiredPlayers: 10
};

const INITIAL_LOGIN_FORM = {
  email: "",
  password: ""
};

const INITIAL_SIGNUP_FORM = {
  name: "",
  email: "",
  phone: "",
  password: ""
};

const INITIAL_GROUP_FORM = {
  name: ""
};

const GOOGLE_CLIENT_ID =
  process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

function App() {
  const [route, setRoute] = useState(getRouteFromHash());
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [authMode, setAuthMode] = useState("login");
  const [eventGroupFilter, setEventGroupFilter] = useState("joined");
  const [groupFilter, setGroupFilter] = useState("joined");
  const [groupSearch, setGroupSearch] = useState("");
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN_FORM);
  const [signupForm, setSignupForm] = useState(INITIAL_SIGNUP_FORM);
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState("");
  const [googleFeedback, setGoogleFeedback] = useState("");

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventFeedback, setEventFeedback] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [editingEventId, setEditingEventId] = useState("");
  const [selectedEventInterests, setSelectedEventInterests] = useState({});

  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState("");
  const [venueForm, setVenueForm] = useState(INITIAL_VENUE_FORM);
  const [editingVenueId, setEditingVenueId] = useState("");
  const [venueSaving, setVenueSaving] = useState(false);
  const [venueFeedback, setVenueFeedback] = useState("");

  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const [groupForm, setGroupForm] = useState(INITIAL_GROUP_FORM);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupFeedback, setGroupFeedback] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState({});
  const [selectedGroupJoinRequests, setSelectedGroupJoinRequests] = useState({});

  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);

  const [leaderApplication, setLeaderApplication] = useState(null);
  const [leaderApplications, setLeaderApplications] = useState([]);
  const [leaderFeedback, setLeaderFeedback] = useState("");
  const [leaderActionLoading, setLeaderActionLoading] = useState(false);

  const handleLogout = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
    setEvents([]);
    setVenues([]);
    setGroups([]);
    setMyGroups([]);
    setLeaderApplication(null);
    setLeaderApplications([]);
    setEditingEventId("");
    setSelectedEventInterests({});
    setSelectedGroupMembers({});
    setSelectedGroupJoinRequests({});
    navigate("dashboard");
  }, []);

  const handleAuthSensitiveError = useCallback((error, setter) => {
    setter(error.message);
    if (/unauthorized/i.test(error.message)) {
      handleLogout();
    }
  }, [handleLogout]);

  const canManageVenues = auth?.user?.role === "ADMIN";
  const canPostEvents =
    auth?.user?.role === "ADMIN" ||
    auth?.user?.role === "LEADER" ||
    groups.some((group) => canCreateEventsForGroup(group, auth?.user));
  const isMember = auth?.user?.role === "MEMBER";
  const isAdmin = auth?.user?.role === "ADMIN";

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError("");

    try {
      const data = await fetchEvents();
      setEvents(data || []);
    } catch (error) {
      handleAuthSensitiveError(error, setEventsError);
    } finally {
      setEventsLoading(false);
    }
  }, [handleAuthSensitiveError]);

  const loadVenues = useCallback(async () => {
    const loader = canManageVenues ? fetchVenues : fetchVisibleVenues;
    setVenuesLoading(true);
    setVenuesError("");

    try {
      const data = await loader();
      setVenues(data || []);
    } catch (error) {
      handleAuthSensitiveError(error, setVenuesError);
    } finally {
      setVenuesLoading(false);
    }
  }, [canManageVenues, handleAuthSensitiveError]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError("");

    try {
      const [allGroups, joinedGroups] = await Promise.all([
        fetchGroups(),
        fetchMyGroups()
      ]);
      setGroups(allGroups || []);
      setMyGroups(joinedGroups || []);
    } catch (error) {
      handleAuthSensitiveError(error, setGroupsError);
    } finally {
      setGroupsLoading(false);
    }
  }, [handleAuthSensitiveError]);

  const loadLeaderApplicationState = useCallback(async () => {
    if (!auth?.token) {
      return;
    }

    try {
      const myStatus = await fetchMyLeaderApplication();
      setLeaderApplication(myStatus);
    } catch (error) {
      handleAuthSensitiveError(error, setLeaderFeedback);
    }
  }, [auth?.token, handleAuthSensitiveError]);

  const loadPendingApplications = useCallback(async () => {
    if (!isAdmin) {
      setLeaderApplications([]);
      return;
    }

    try {
      const data = await fetchLeaderApplications();
      setLeaderApplications(data || []);
    } catch (error) {
      handleAuthSensitiveError(error, setLeaderFeedback);
    }
  }, [handleAuthSensitiveError, isAdmin]);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!auth?.token) {
      return;
    }

    loadEvents();
    loadGroups();
    loadVenues();
    loadLeaderApplicationState();
    loadPendingApplications();
  }, [auth?.token, loadEvents, loadGroups, loadLeaderApplicationState, loadPendingApplications, loadVenues]);

  useEffect(() => {
    if (!eventForm.venueId && venues.length > 0) {
      setEventForm((current) => ({ ...current, venueId: venues[0].id }));
    }
  }, [eventForm.venueId, venues]);

  useEffect(() => {
    const preferredGroupId = (myGroups[0] || groups[0])?.id;
    if (!preferredGroupId) {
      return;
    }

    setEventForm((current) => (
      current.groupId === DEFAULT_GROUP_ID ? { ...current, groupId: preferredGroupId } : current
    ));
    setVenueForm((current) => (
      current.groupId === DEFAULT_GROUP_ID ? { ...current, groupId: preferredGroupId } : current
    ));
  }, [groups, myGroups]);

  const visibleVenues = useMemo(
    () => venues.filter((venue) => venue.isActive !== false),
    [venues]
  );

  const postableGroups = groups.filter((group) => canCreateEventsForGroup(group, auth?.user));
  const approvedGroups = myGroups.filter((group) => isApprovedForUser(group, auth?.user?.id));
  const selectableGroups = canPostEvents
    ? postableGroups
    : approvedGroups.length > 0 ? approvedGroups : groups.filter((group) => isApprovedForUser(group, auth?.user?.id));

  useEffect(() => {
    if (!canPostEvents || selectableGroups.length === 0) {
      return;
    }

    const selectedGroupStillPostable = selectableGroups.some((group) => group.id === eventForm.groupId);
    if (!selectedGroupStillPostable) {
      setEventForm((current) => ({ ...current, groupId: selectableGroups[0].id }));
    }
  }, [canPostEvents, eventForm.groupId, selectableGroups]);

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthFeedback("");
    setGoogleFeedback("");

    try {
      const data = await login({
        email: loginForm.email.trim(),
        password: loginForm.password
      });
      writeStoredAuth(data);
      setAuth(data);
      navigate("dashboard");
    } catch (error) {
      setAuthFeedback(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthFeedback("");
    setGoogleFeedback("");

    try {
      const data = await signup({
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        phone: signupForm.phone.trim(),
        password: signupForm.password
      });
      writeStoredAuth(data);
      setAuth(data);
      navigate("dashboard");
    } catch (error) {
      setAuthFeedback(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  const handleGoogleCredential = useCallback(async (credential) => {
    if (!credential) {
      setGoogleFeedback("Google did not return a sign-in token. Try again.");
      return;
    }

    setAuthLoading(true);
    setAuthFeedback("");
    setGoogleFeedback("Checking Google account...");

    try {
      const data = await googleLogin({ credential });
      writeStoredAuth(data);
      setAuth(data);
      setGoogleFeedback("");
      navigate("dashboard");
    } catch (error) {
      setGoogleFeedback(error.message || "Google sign-in failed.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  async function handleLeaderApply() {
    setLeaderActionLoading(true);
    setLeaderFeedback("");

    try {
      const data = await applyForLeader();
      setLeaderApplication(data);
      setLeaderFeedback("Leader application submitted.");
    } catch (error) {
      handleAuthSensitiveError(error, setLeaderFeedback);
    } finally {
      setLeaderActionLoading(false);
    }
  }

  async function reviewLeaderApplication(userId, action) {
    setLeaderActionLoading(true);
    setLeaderFeedback("");

    try {
      if (action === "approve") {
        await approveLeaderApplication(userId);
      } else {
        await rejectLeaderApplication(userId);
      }
      setLeaderFeedback(`Application ${action}d.`);
      await loadPendingApplications();
    } catch (error) {
      handleAuthSensitiveError(error, setLeaderFeedback);
    } finally {
      setLeaderActionLoading(false);
    }
  }

  async function handleEventSubmit(event) {
    event.preventDefault();
    setEventSaving(true);
    setEventFeedback("");
    setCreatedEvent(null);

    if (Number(eventForm.requiredPlayers) > Number(eventForm.maxPlayers)) {
      setEventFeedback("Max players must be greater than or equal to required players.");
      setEventSaving(false);
      return;
    }

    try {
      const payload = {
        groupId: eventForm.groupId,
        venueId: eventForm.venueId,
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        startTime: buildIsoTimestamp(eventForm.date, eventForm.startClock),
        endTime: buildIsoTimestamp(eventForm.date, eventForm.endClock),
        maxPlayers: Number(eventForm.maxPlayers),
        requiredPlayers: Number(eventForm.requiredPlayers)
      };
      const data = editingEventId
        ? await updateEvent(editingEventId, payload)
        : await createEvent(payload);

      setCreatedEvent(data);
      setEventFeedback(editingEventId ? "Event updated successfully." : "Event created successfully.");
      setEditingEventId("");
      setEventForm((current) => ({
        ...INITIAL_EVENT_FORM,
        groupId: current.groupId,
        venueId: current.venueId
      }));
      await loadEvents();
    } catch (error) {
      handleAuthSensitiveError(error, setEventFeedback);
    } finally {
      setEventSaving(false);
    }
  }

  async function handleGroupSubmit(event) {
    event.preventDefault();
    setGroupSaving(true);
    setGroupFeedback("");

    try {
      const data = await createGroup({
        name: groupForm.name.trim()
      });
      setGroupForm(INITIAL_GROUP_FORM);
      setGroupFeedback("Group created.");
      setEventForm((current) => ({ ...current, groupId: data.id }));
      setVenueForm((current) => ({ ...current, groupId: data.id }));
      await loadGroups();
    } catch (error) {
      handleAuthSensitiveError(error, setGroupFeedback);
    } finally {
      setGroupSaving(false);
    }
  }

  async function handleJoinGroup(groupId) {
    setGroupFeedback("");

    try {
      await joinGroup(groupId);
      setGroupFeedback("Join request sent.");
      await loadGroups();
    } catch (error) {
      handleAuthSensitiveError(error, setGroupFeedback);
    }
  }

  async function handleShowGroupMembers(groupId) {
    setGroupFeedback("");

    try {
      const data = await fetchGroupMembers(groupId);
      setSelectedGroupMembers((current) => ({ ...current, [groupId]: data || [] }));
    } catch (error) {
      handleAuthSensitiveError(error, setGroupFeedback);
    }
  }

  async function handleShowGroupJoinRequests(groupId) {
    setGroupFeedback("");

    try {
      const data = await fetchGroupJoinRequests(groupId);
      setSelectedGroupJoinRequests((current) => ({ ...current, [groupId]: data || [] }));
    } catch (error) {
      handleAuthSensitiveError(error, setGroupFeedback);
    }
  }

  async function handleReviewGroupJoinRequest(groupId, memberId, action) {
    setGroupFeedback("");

    try {
      if (action === "approve") {
        await approveGroupMember(groupId, memberId);
      } else {
        await rejectGroupMember(groupId, memberId);
      }
      setGroupFeedback(`Join request ${action}d.`);
      const data = await fetchGroupJoinRequests(groupId);
      setSelectedGroupJoinRequests((current) => ({ ...current, [groupId]: data || [] }));
      await loadGroups();
    } catch (error) {
      handleAuthSensitiveError(error, setGroupFeedback);
    }
  }

  async function handleEventInterest(eventId, status) {
    setEventFeedback("");

    try {
      await expressInterest(eventId, { status });
      setEventFeedback(`Interest updated: ${status}`);
      await loadEvents();
    } catch (error) {
      handleAuthSensitiveError(error, setEventFeedback);
    }
  }

  async function handleShowInterests(eventId) {
    setEventFeedback("");

    try {
      const data = await fetchEventInterests(eventId);
      setSelectedEventInterests((current) => ({ ...current, [eventId]: data || [] }));
    } catch (error) {
      handleAuthSensitiveError(error, setEventFeedback);
    }
  }

  function handleEditEvent(event) {
    setEditingEventId(event.id);
    setCreatedEvent(null);
    setEventFeedback("");
    setEventForm({
      groupId: event.groupId,
      venueId: event.venueId,
      title: event.title || "",
      description: event.description || "",
      date: toDateInputValue(event.startTime),
      startClock: toTimeInputValue(event.startTime),
      endClock: toTimeInputValue(event.endTime),
      maxPlayers: event.maxPlayers || 14,
      requiredPlayers: event.requiredPlayers || 10
    });
    navigate("events");
  }

  function handleCancelEventEdit() {
    setEditingEventId("");
    setCreatedEvent(null);
    setEventFeedback("");
    setEventForm((current) => ({
      ...INITIAL_EVENT_FORM,
      groupId: current.groupId,
      venueId: current.venueId
    }));
  }

  async function handleDeleteEvent(eventId) {
    setEventFeedback("");

    try {
      await deleteEvent(eventId);
      setEventFeedback("Event removed.");
      await loadEvents();
    } catch (error) {
      handleAuthSensitiveError(error, setEventFeedback);
    }
  }

  async function handleVenueSubmit(event) {
    event.preventDefault();
    setVenueSaving(true);
    setVenueFeedback("");

    const payload = {
      groupId: venueForm.groupId || null,
      name: venueForm.name.trim(),
      address: venueForm.address.trim(),
      mapUrl: venueForm.mapUrl.trim(),
      latitude: venueForm.latitude ? Number(venueForm.latitude) : null,
      longitude: venueForm.longitude ? Number(venueForm.longitude) : null,
      isActive: venueForm.isActive
    };

    try {
      if (editingVenueId) {
        await updateVenue(editingVenueId, payload);
        setVenueFeedback("Venue updated.");
      } else {
        await createVenue(payload);
        setVenueFeedback("Venue created.");
      }
      setVenueForm(INITIAL_VENUE_FORM);
      setEditingVenueId("");
      await loadVenues();
    } catch (error) {
      handleAuthSensitiveError(error, setVenueFeedback);
    } finally {
      setVenueSaving(false);
    }
  }

  function startEditingVenue(venue) {
    setEditingVenueId(venue.id);
    setVenueForm({
      groupId: venue.groupId || DEFAULT_GROUP_ID,
      name: venue.name || "",
      address: venue.address || "",
      mapUrl: venue.mapUrl || "",
      latitude: venue.latitude ?? "",
      longitude: venue.longitude ?? "",
      isActive: Boolean(venue.isActive)
    });
    navigate("venues");
  }

  async function handleVenueDelete(venueId) {
    setVenueFeedback("");

    try {
      await deleteVenue(venueId);
      setVenueFeedback("Venue archived.");
      await loadVenues();
    } catch (error) {
      handleAuthSensitiveError(error, setVenueFeedback);
    }
  }

  function patchAuthUser(fields) {
    setAuth((current) => {
      if (!current) {
        return current;
      }
      const next = {
        ...current,
        user: {
          ...current.user,
          ...fields
        }
      };
      writeStoredAuth(next);
      return next;
    });
  }

  useEffect(() => {
    if (leaderApplication) {
      patchAuthUser({
        role: leaderApplication.role,
        leaderApplicationStatus: leaderApplication.status
      });
    }
  }, [leaderApplication]);

  useEffect(() => {
    if (!leaderFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLeaderFeedback("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [leaderFeedback]);

  if (!auth?.token) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        onLoginSubmit={handleLoginSubmit}
        onSignupSubmit={handleSignupSubmit}
        onGoogleCredential={handleGoogleCredential}
        loading={authLoading}
        feedback={authFeedback}
        googleFeedback={googleFeedback}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <div className="brand-mark">FC</div>
          <div className="brand-copy">
            <span className="brand-name">FutsalCall</span>
            <span className="brand-tag">Role-driven ops</span>
          </div>
        </div>
        <div className="profile-stack">
          <div className="profile-meta">
            <strong>{auth.user.name}</strong>
            <span>{auth.user.role}</span>
          </div>
          <button className="profile-pill" type="button" onClick={handleLogout}>
            Out
          </button>
        </div>
      </header>

      <main className="page-shell">
        {route === "dashboard" && (
          <HomePage
            authUser={auth.user}
            events={events}
            groups={groups}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}

        {route === "settings" && (
          <SettingsPage
            authUser={auth.user}
            leaderApplication={leaderApplication}
            leaderApplications={leaderApplications}
            onApplyLeader={handleLeaderApply}
            onReviewApplication={reviewLeaderApplication}
            leaderActionLoading={leaderActionLoading}
            leaderFeedback={leaderFeedback}
          />
        )}

        {route === "events" && (
          <EventsPage
            authUser={auth.user}
            events={events}
            loading={eventsLoading}
            error={eventsError}
            eventForm={eventForm}
            setEventForm={setEventForm}
            onCreateEvent={handleEventSubmit}
            eventSaving={eventSaving}
            createdEvent={createdEvent}
            editingEventId={editingEventId}
            onCancelEventEdit={handleCancelEventEdit}
            feedback={eventFeedback}
            visibleVenues={visibleVenues}
            groups={selectableGroups}
            allGroups={groups}
            groupFilter={eventGroupFilter}
            setGroupFilter={setEventGroupFilter}
            canPostEvents={canPostEvents}
            isMember={isMember}
            onExpressInterest={handleEventInterest}
            onJoinGroup={handleJoinGroup}
            onShowInterests={handleShowInterests}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
            selectedEventInterests={selectedEventInterests}
          />
        )}

        {route === "groups" && (
          <GroupsPage
            authUser={auth.user}
            groups={groups}
            myGroups={myGroups}
            loading={groupsLoading}
            error={groupsError}
            form={groupForm}
            setForm={setGroupForm}
            onSubmit={handleGroupSubmit}
            onJoin={handleJoinGroup}
            onShowMembers={handleShowGroupMembers}
            onShowJoinRequests={handleShowGroupJoinRequests}
            onReviewJoinRequest={handleReviewGroupJoinRequest}
            selectedGroupMembers={selectedGroupMembers}
            selectedGroupJoinRequests={selectedGroupJoinRequests}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            groupSearch={groupSearch}
            setGroupSearch={setGroupSearch}
            feedback={groupFeedback}
            saving={groupSaving}
          />
        )}

        {route === "venues" && (
          <VenuesPage
            canManageVenues={canManageVenues}
            loading={venuesLoading}
            error={venuesError}
            venues={venues}
            form={venueForm}
            setForm={setVenueForm}
            groups={groups}
            editingVenueId={editingVenueId}
            onSubmit={handleVenueSubmit}
            onEdit={startEditingVenue}
            onDelete={handleVenueDelete}
            onReset={() => {
              setEditingVenueId("");
              setVenueForm(INITIAL_VENUE_FORM);
              setVenueFeedback("");
            }}
            feedback={venueFeedback}
            saving={venueSaving}
          />
        )}
      </main>

      {leaderFeedback ? <div className="toast-message">{leaderFeedback}</div> : null}

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={route === item.key ? "nav-item active" : "nav-item"}
            type="button"
            onClick={() => navigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function AuthPage({
  authMode,
  setAuthMode,
  loginForm,
  setLoginForm,
  signupForm,
  setSignupForm,
  onLoginSubmit,
  onSignupSubmit,
  onGoogleCredential,
  loading,
  feedback,
  googleFeedback
}) {
  const googleButtonRef = useRef(null);
  const onGoogleCredentialRef = useRef(onGoogleCredential);

  useEffect(() => {
    onGoogleCredentialRef.current = onGoogleCredential;
  }, [onGoogleCredential]);

  useEffect(() => {
    let isMounted = true;

    function renderGoogleButton() {
      if (!GOOGLE_CLIENT_ID || !isMounted || !googleButtonRef.current || !window.google?.accounts?.id) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.__afcGoogleCredentialHandler = (response) => {
        if (response?.credential) {
          onGoogleCredentialRef.current(response.credential);
        }
      };
      if (window.__afcGoogleInitializedClientId !== GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => window.__afcGoogleCredentialHandler?.(response)
        });
        window.__afcGoogleInitializedClientId = GOOGLE_CLIENT_ID;
      }
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "continue_with",
        width: googleButtonRef.current.offsetWidth || 320
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const existingScript = document.querySelector("script[src='https://accounts.google.com/gsi/client']");
      if (existingScript) {
        existingScript.addEventListener("load", renderGoogleButton, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.addEventListener("load", renderGoogleButton, { once: true });
        document.body.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="hero-copy">
          <span className="eyebrow">Secure access</span>
          <h1>Members, leaders, admin.</h1>
          <p>
            Members can browse events and show interest. Leaders can post and remove
            events after admin approval. Admin manages the workflow.
          </p>
        </div>

        <div className="auth-switch">
          <button
            className={authMode === "login" ? "nav-item active" : "nav-item"}
            type="button"
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            className={authMode === "signup" ? "nav-item active" : "nav-item"}
            type="button"
            onClick={() => setAuthMode("signup")}
          >
            Sign up
          </button>
        </div>

        <div className="panel google-auth-panel">
          {GOOGLE_CLIENT_ID ? (
            <div className="google-button-shell" ref={googleButtonRef} />
          ) : (
            <button className="google-fallback-button" disabled type="button">
              <span className="google-mark">G</span>
              <span>Continue with Google</span>
            </button>
          )}
          <span className="auth-divider">or</span>
          {googleFeedback ? <p className="google-feedback">{googleFeedback}</p> : null}
        </div>

        {authMode === "login" ? (
          <form className="panel stack-lg" onSubmit={onLoginSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((current) => ({ ...current, email: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))}
                required
              />
            </label>

            <button className="primary-button wide" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Login"}
            </button>

          </form>
        ) : (
          <form className="panel stack-lg" onSubmit={onSignupSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                value={signupForm.name}
                onChange={(e) => setSignupForm((current) => ({ ...current, name: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm((current) => ({ ...current, email: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Phone</span>
              <input
                value={signupForm.phone}
                onChange={(e) => setSignupForm((current) => ({ ...current, phone: e.target.value }))}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={signupForm.password}
                onChange={(e) => setSignupForm((current) => ({ ...current, password: e.target.value }))}
                minLength="8"
                required
              />
            </label>

            <button className="primary-button wide" disabled={loading} type="submit">
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>
        )}

        {feedback ? <p className="inline-feedback">{feedback}</p> : null}
      </section>
    </div>
  );
}

function HomePage({ authUser, events, groups, onEditEvent, onDeleteEvent }) {
  const approvedGroupIds = new Set(
    (groups || [])
      .filter((group) => isApprovedForUser(group, authUser.id))
      .map((group) => group.id)
  );
  const groupsById = new Map((groups || []).map((group) => [group.id, group]));
  const joinedEvents = (events || []).filter((event) => approvedGroupIds.has(event.groupId));
  const nextEvent = joinedEvents[0];

  return (
    <section className="stack-xl">
      <div className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">Home</span>
          <h1>Hello, {authUser.name.split(" ")[0]}.</h1>
          <p>Your joined-group events are shown here so you can quickly see what is coming up.</p>
        </div>
        <div className="home-next-match">
          <span className="metric-label">Next event</span>
          <strong>{nextEvent ? nextEvent.title : "No event yet"}</strong>
          <p>{nextEvent ? new Date(nextEvent.startTime).toLocaleString() : "Joined group events will appear here."}</p>
        </div>
      </div>

      <div className="mini-grid">
        <article className="metric-card">
          <span className="metric-label">Joined events</span>
          <strong>{joinedEvents.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Joined groups</span>
          <strong>{approvedGroupIds.size}</strong>
        </article>
      </div>

      <div className="panel stack-md">
        <div className="panel-header">
          <h2>Your events</h2>
        </div>
        {joinedEvents.length === 0 ? (
          <p className="muted-copy">No events from your joined groups yet.</p>
        ) : (
          joinedEvents.slice(0, 5).map((event) => (
            <HomeEventCard
              key={event.id}
              authUser={authUser}
              event={event}
              group={groupsById.get(event.groupId)}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
            />
          ))
        )}
      </div>
    </section>
  );
}

function HomeEventCard({ authUser, event, group, onEditEvent, onDeleteEvent }) {
  const canManage = canManageEvent(event, group, authUser);
  const confirmedCount = event.confirmedCount || 0;
  const interestedCount = event.interestedCount || 0;
  const maybeCount = event.maybeCount || 0;

  return (
    <article className="home-event-card">
      <div className="home-event-main">
        <div>
          <span className="status-chip">{event.status}</span>
          <h3>{event.title}</h3>
          <p className="muted-copy">{group?.name || "Joined group"}</p>
        </div>
        <div className="venue-meta">
          <span>{new Date(event.startTime).toLocaleString()}</span>
        </div>
      </div>

      <div className="home-event-stats">
        <div>
          <strong>{confirmedCount}</strong>
          <span>Going</span>
        </div>
        <div>
          <strong>{interestedCount}</strong>
          <span>Interested</span>
        </div>
        <div>
          <strong>{maybeCount}</strong>
          <span>Maybe</span>
        </div>
      </div>

      {canManage ? (
        <div className="home-event-actions">
          <button className="ghost-button small" type="button" onClick={() => onEditEvent(event)}>
            Edit details
          </button>
          <button className="ghost-button danger small" type="button" onClick={() => onDeleteEvent(event.id)}>
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}

function SettingsPage({
  authUser,
  leaderApplication,
  leaderApplications,
  onApplyLeader,
  onReviewApplication,
  leaderActionLoading,
  leaderFeedback
}) {
  const leaderStatus = leaderApplication?.status || authUser.leaderApplicationStatus || "NONE";
  const leaderUpgradeUi = getLeaderUpgradeUi(leaderStatus, leaderActionLoading);
  const showLeaderMetric = authUser.role === "MEMBER";

  return (
    <section className="stack-xl">
      <div className="hero-copy">
        <span className="eyebrow">Settings</span>
        <h1>Account and role settings.</h1>
        <p>
          Current role: <strong>{authUser.role}</strong>. Members browse and show
          interest. Leaders post events. Admin approves leader access.
        </p>
      </div>

      <div className="mini-grid">
        {showLeaderMetric ? (
          <article className="metric-card">
            <span className="metric-label">Leader status</span>
            <strong>{leaderStatus}</strong>
          </article>
        ) : null}
      </div>

      {authUser.role === "MEMBER" ? (
        <div className="hero-card">
          <div className={`status-chip${leaderUpgradeUi.positive ? " positive" : ""}`}>{leaderUpgradeUi.badge}</div>
          <h2>Become a leader</h2>
          <p className="muted-copy">
            {leaderUpgradeUi.description}
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              disabled={leaderUpgradeUi.disabled}
              type="button"
              onClick={onApplyLeader}
            >
              {leaderUpgradeUi.label}
            </button>
          </div>
        </div>
      ) : null}

      {authUser.role === "ADMIN" ? (
        <div className="panel stack-md">
          <div className="panel-header">
            <h2>Pending leader applications</h2>
          </div>
          {leaderApplications.length === 0 ? (
            <p className="muted-copy">No pending applications.</p>
          ) : (
            leaderApplications.map((application) => (
              <div className="venue-card" key={application.userId}>
                <div className="venue-card-top">
                  <div>
                    <span className="status-chip">Pending</span>
                    <h3>{application.name}</h3>
                    <p className="muted-copy">{application.email}</p>
                  </div>
                  <div className="venue-meta">
                    <span>{application.phone || "-"}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    className="primary-button"
                    disabled={leaderActionLoading}
                    type="button"
                    onClick={() => onReviewApplication(application.userId, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    className="ghost-button danger"
                    disabled={leaderActionLoading}
                    type="button"
                    onClick={() => onReviewApplication(application.userId, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

function EventsPage({
  authUser,
  events,
  loading,
  error,
  eventForm,
  setEventForm,
  onCreateEvent,
  eventSaving,
  createdEvent,
  editingEventId,
  onCancelEventEdit,
  feedback,
  visibleVenues,
  groups,
  allGroups,
  groupFilter,
  setGroupFilter,
  canPostEvents,
  isMember,
  onExpressInterest,
  onJoinGroup,
  onShowInterests,
  onEditEvent,
  onDeleteEvent,
  selectedEventInterests
}) {
  const invalidPlayerCounts =
    Number(eventForm.requiredPlayers || 0) > Number(eventForm.maxPlayers || 0);
  const approvedGroupIds = new Set(
    (allGroups || [])
      .filter((group) => isApprovedForUser(group, authUser.id))
      .map((group) => group.id)
  );
  const groupsById = new Map((allGroups || []).map((group) => [group.id, group]));
  const eventSections = isMember
    ? [{
        title: groupFilter === "joined" ? "Posts from joined groups" : "Posts from other groups",
        empty: groupFilter === "joined" ? "No posts in your joined groups." : "No public posts from other groups.",
        events: events.filter((event) => groupFilter === "joined"
          ? approvedGroupIds.has(event.groupId)
          : !approvedGroupIds.has(event.groupId))
      }]
    : [{ title: "All event posts", empty: "No event posts yet.", events }];

  return (
    <section className="stack-xl">
      <div className="section-head">
        <span className="eyebrow">Events</span>
        <h1>{canPostEvents ? "Post and manage matches" : "Browse and show interest"}</h1>
        <p>
          {canPostEvents
            ? "Leaders and admins can create, update, and remove event posts."
            : "Members can view open events and express interest."}
        </p>
      </div>

      {canPostEvents ? (
        <form className="panel stack-lg" onSubmit={onCreateEvent}>
          <label className="field">
            <span>Match title</span>
            <input
              value={eventForm.title}
              onChange={(e) => setEventForm((current) => ({ ...current, title: e.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows="4"
              value={eventForm.description}
              onChange={(e) => setEventForm((current) => ({ ...current, description: e.target.value }))}
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Group</span>
              <select
                value={eventForm.groupId}
                onChange={(e) => setEventForm((current) => ({ ...current, groupId: e.target.value }))}
                disabled={Boolean(editingEventId)}
                required
              >
                <option value="">Select group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm((current) => ({ ...current, date: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Venue</span>
              <select
                value={eventForm.venueId}
                onChange={(e) => setEventForm((current) => ({ ...current, venueId: e.target.value }))}
                required
              >
                <option value="">Select venue</option>
                {visibleVenues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Kick-off</span>
              <input
                type="time"
                value={eventForm.startClock}
                onChange={(e) => setEventForm((current) => ({ ...current, startClock: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Finish</span>
              <input
                type="time"
                value={eventForm.endClock}
                onChange={(e) => setEventForm((current) => ({ ...current, endClock: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Required players</span>
              <input
                type="number"
                min="1"
                value={eventForm.requiredPlayers}
                onChange={(e) => setEventForm((current) => ({ ...current, requiredPlayers: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Max players</span>
              <input
                type="number"
                min={eventForm.requiredPlayers || 1}
                value={eventForm.maxPlayers}
                onChange={(e) => setEventForm((current) => ({ ...current, maxPlayers: e.target.value }))}
                required
              />
            </label>
          </div>

          {invalidPlayerCounts ? (
            <p className="inline-feedback">Max players must be greater than or equal to required players.</p>
          ) : null}

          <button className="primary-button wide" disabled={eventSaving || invalidPlayerCounts} type="submit">
            {eventSaving ? "Saving..." : editingEventId ? "Update event" : "Post event"}
          </button>

          {editingEventId ? (
            <button className="ghost-button wide" type="button" onClick={onCancelEventEdit}>
              Cancel edit
            </button>
          ) : null}

          {createdEvent ? (
            <div className="response-panel">
              <div className="status-chip positive">Posted</div>
              <h3>{createdEvent.title}</h3>
              <p className="muted-copy">Event ID: {createdEvent.id}</p>
            </div>
          ) : null}
        </form>
      ) : null}

      {feedback ? <p className="inline-feedback">{feedback}</p> : null}
      {loading ? <div className="panel">Loading events...</div> : null}
      {error ? <div className="panel error-panel">{error}</div> : null}

      {isMember ? (
        <SegmentedToggle
          value={groupFilter}
          onChange={setGroupFilter}
          options={[
            { value: "joined", label: "Joined" },
            { value: "other", label: "Not joined" }
          ]}
        />
      ) : null}

      {!loading && eventSections.map((section) => (
        <div className="stack-md" key={section.title}>
          <div className="list-section-head">
            <h2>{section.title}</h2>
          </div>
          {section.events.length === 0 ? <div className="panel">{section.empty}</div> : null}
          {section.events.map((event) => (
            <EventPostCard
              key={event.id}
              authUser={authUser}
              event={event}
              group={groupsById.get(event.groupId)}
              canRespond={!isMember || approvedGroupIds.has(event.groupId)}
              canManage={canManageEvent(event, groupsById.get(event.groupId), authUser)}
              isMember={isMember}
              onDeleteEvent={onDeleteEvent}
              onExpressInterest={onExpressInterest}
              onJoinGroup={onJoinGroup}
              onShowInterests={onShowInterests}
              onEditEvent={onEditEvent}
              selectedEventInterests={selectedEventInterests}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

function EventPostCard({
  authUser,
  event,
  group,
  canRespond,
  canManage,
  isMember,
  onDeleteEvent,
  onExpressInterest,
  onJoinGroup,
  onShowInterests,
  onEditEvent,
  selectedEventInterests
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isPending = group?.currentUserStatus === "PENDING";
  const isRejected = group?.currentUserStatus === "REJECTED";
  const confirmedCount = event.confirmedCount || 0;
  const interestedCount = event.interestedCount || 0;
  const maybeCount = event.maybeCount || 0;
  const remainingSlots = Math.max((event.maxPlayers || 0) - confirmedCount, 0);

  return (
    <article className="venue-card">
      <div className="venue-card-top">
        <div>
          <span className="status-chip">{event.status}</span>
          <h3>{event.title}</h3>
          <p className="muted-copy">{event.description || "No description"}</p>
          <p className="muted-copy">
            {new Date(event.startTime).toLocaleString()} to {new Date(event.endTime).toLocaleTimeString()}
          </p>
        </div>
        <div className="venue-meta">
          <span>{event.requiredPlayers}/{event.maxPlayers}</span>
        </div>
      </div>

      <div className="event-counts-grid">
        <div>
          <span>Going</span>
          <strong>{confirmedCount}</strong>
        </div>
        <div>
          <span>Interested</span>
          <strong>{interestedCount}</strong>
        </div>
        <div>
          <span>Maybe</span>
          <strong>{maybeCount}</strong>
        </div>
        <div>
          <span>Open</span>
          <strong>{remainingSlots}</strong>
        </div>
      </div>

      <div className="card-actions">
        {isMember && canRespond ? (
          <>
            <button className="ghost-button small" type="button" onClick={() => onExpressInterest(event.id, "INTERESTED")}>
              Interested
            </button>
            <button className="ghost-button small" type="button" onClick={() => onExpressInterest(event.id, "GOING")}>
              Going
            </button>
            <button className="ghost-button small" type="button" onClick={() => onExpressInterest(event.id, "MAYBE")}>
              Maybe
            </button>
          </>
        ) : null}

        {isMember && !canRespond ? (
          <>
            <button className="ghost-button small" type="button" onClick={() => setDetailsOpen((current) => !current)}>
              View
            </button>
            <button
              className="primary-button"
              disabled={isPending}
              type="button"
              onClick={() => onJoinGroup(event.groupId)}
            >
              {isPending ? "Pending" : isRejected ? "Request again" : "Request to join"}
            </button>
          </>
        ) : null}

        {canManage ? (
          <>
            <button className="ghost-button small" type="button" onClick={() => onEditEvent(event)}>
              Edit
            </button>
            <button className="ghost-button small" type="button" onClick={() => onShowInterests(event.id)}>
              Show interests
            </button>
            <button className="ghost-button danger small" type="button" onClick={() => onDeleteEvent(event.id)}>
              Remove post
            </button>
          </>
        ) : null}
      </div>

      {detailsOpen ? (
        <div className="response-panel">
          <div className="status-chip">Details</div>
          <p className="muted-copy">Group: {group?.name || event.groupId}</p>
          <p className="muted-copy">Going: {confirmedCount}</p>
          <p className="muted-copy">Interested: {interestedCount}</p>
          <p className="muted-copy">Maybe: {maybeCount}</p>
        </div>
      ) : null}

      {selectedEventInterests[event.id]?.length ? (
        <div className="response-panel">
          <div className="status-chip positive">Interests</div>
          {selectedEventInterests[event.id].map((interest) => (
            <p className="muted-copy" key={interest.id}>
              {interest.userName} - {interest.status}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SegmentedToggle({ value, onChange, options }) {
  return (
    <div className="segmented-toggle" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function isApprovedForUser(group, userId) {
  return group?.currentUserStatus === "APPROVED" || group?.createdBy === userId;
}

function canCreateEventsForGroup(group, user) {
  if (!group || !user) {
    return false;
  }
  if (user.role === "ADMIN" || user.role === "LEADER") {
    return true;
  }
  return isApprovedForUser(group, user.id) && ["OWNER", "ORGANIZER", "LEADER", "ADMIN"].includes(group.currentUserRole);
}

function canManageEvent(event, group, user) {
  if (!event || !user) {
    return false;
  }
  if (user.role === "ADMIN" || user.role === "LEADER") {
    return true;
  }
  if (event.createdBy === user.id) {
    return true;
  }
  return canCreateEventsForGroup(group, user);
}

function GroupsPage({
  authUser,
  groups,
  myGroups,
  loading,
  error,
  form,
  setForm,
  onSubmit,
  onJoin,
  onShowMembers,
  onShowJoinRequests,
  onReviewJoinRequest,
  selectedGroupMembers,
  selectedGroupJoinRequests,
  groupFilter,
  setGroupFilter,
  groupSearch,
  setGroupSearch,
  feedback,
  saving
}) {
  const joinedGroups = groups.filter((group) => isApprovedForUser(group, authUser.id));
  const createdGroups = groups.filter((group) => group.createdBy === authUser.id);
  const canReviewRequests = authUser.role === "ADMIN" || authUser.role === "LEADER" || createdGroups.length > 0;
  const normalizedSearch = groupSearch.trim().toLowerCase();
  const searchedGroups = groups.filter((group) => group.name.toLowerCase().includes(normalizedSearch));
  const visibleGroupSection = {
    title: groupFilter === "joined" ? "Joined groups" : groupFilter === "mine" ? "My groups" : "All groups",
    empty: groupFilter === "joined"
      ? "You have not joined any groups yet."
      : groupFilter === "mine"
        ? "You have not created any groups yet."
        : "No groups match your search.",
    groups: groupFilter === "joined" ? joinedGroups : groupFilter === "mine" ? createdGroups : searchedGroups
  };
  const requestGroups = createdGroups.length > 0 ? createdGroups : joinedGroups;
  const requestGroupIds = requestGroups.map((group) => group.id).join(",");
  const groupsWithRequests = requestGroups.filter((group) => (selectedGroupJoinRequests[group.id] || []).length > 0);

  useEffect(() => {
    if (groupFilter !== "requests" || !canReviewRequests) {
      return;
    }

    requestGroupIds.split(",").filter(Boolean).forEach((groupId) => {
      onShowJoinRequests(groupId);
    });
  }, [canReviewRequests, groupFilter, onShowJoinRequests, requestGroupIds]);

  return (
    <section className="stack-xl">
      <div className="section-head">
        <span className="eyebrow">Groups</span>
        <h1>Manage squads</h1>
        <p>Create a group for a regular futsal circle, join existing groups, and review members.</p>
      </div>

      <div className="page-columns">
        <form className="panel stack-lg" onSubmit={onSubmit}>
          <div className="panel-header">
            <h2>Create group</h2>
          </div>

          <label className="field">
            <span>Group name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              required
            />
          </label>

          <button className="primary-button wide" disabled={saving} type="submit">
            {saving ? "Creating..." : "Create group"}
          </button>

          {feedback ? <p className="inline-feedback">{feedback}</p> : null}
        </form>

        <div className="stack-md">
          {loading ? <div className="panel">Loading groups...</div> : null}
          {error ? <div className="panel error-panel">{error}</div> : null}
          {!loading && groups.length === 0 ? (
            <div className="panel">No groups yet.</div>
          ) : null}

          {!loading && groups.length > 0 ? (
            <>
              <SegmentedToggle
                value={groupFilter}
                onChange={setGroupFilter}
                options={[
                  { value: "joined", label: "Joined" },
                  { value: "all", label: "All groups" },
                  { value: "mine", label: "My groups" },
                  ...(canReviewRequests ? [{ value: "requests", label: "Requests" }] : [])
                ]}
              />
              {groupFilter === "requests" ? (
                <div className="stack-md">
                  <div className="list-section-head">
                    <h2>Incoming requests</h2>
                  </div>
                  {requestGroups.length === 0 ? <div className="panel">No groups available for request review.</div> : null}
                  {requestGroups.length > 0 && groupsWithRequests.length === 0 ? <div className="panel">No pending requests.</div> : null}
                  {groupsWithRequests.map((group) => {
                    const joinRequests = selectedGroupJoinRequests[group.id] || [];

                    return (
                      <article className="venue-card" key={group.id}>
                        <div className="venue-card-top">
                          <div>
                            <span className="status-chip">Requests</span>
                            <h3>{group.name}</h3>
                            <p className="muted-copy">{joinRequests.length} pending requests</p>
                          </div>
                          <div className="venue-meta">
                            <span>{group.createdBy === authUser.id ? "Owner" : "Reviewer"}</span>
                          </div>
                        </div>

                        <div className="card-actions">
                          <button className="ghost-button small" type="button" onClick={() => onShowJoinRequests(group.id)}>
                            Refresh
                          </button>
                        </div>

                        <div className="response-panel">
                          {joinRequests.map((member) => (
                            <div className="request-row" key={member.id}>
                              <p className="muted-copy">
                                {member.userName} - {member.status}
                              </p>
                              <div className="card-actions">
                                <button className="primary-button" type="button" onClick={() => onReviewJoinRequest(group.id, member.id, "approve")}>
                                  Approve
                                </button>
                                <button className="ghost-button danger small" type="button" onClick={() => onReviewJoinRequest(group.id, member.id, "reject")}>
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <>
                  {groupFilter === "all" ? (
                    <label className="field">
                      <span>Search groups</span>
                      <input
                        value={groupSearch}
                        onChange={(event) => setGroupSearch(event.target.value)}
                        placeholder="Search by group name"
                      />
                    </label>
                  ) : null}
                  <div className="list-section-head">
                    <h2>{visibleGroupSection.title}</h2>
                  </div>
                  {visibleGroupSection.groups.length === 0 ? <div className="panel">{visibleGroupSection.empty}</div> : null}
                  {visibleGroupSection.groups.map((group) => {
            const isJoined = isApprovedForUser(group, authUser.id);
            const isPending = group.currentUserStatus === "PENDING";
            const isRejected = group.currentUserStatus === "REJECTED";
            const members = selectedGroupMembers[group.id] || [];

            return (
              <article className="venue-card" key={group.id}>
                <div className="venue-card-top">
                  <div>
                    <span className={isJoined ? "status-chip positive" : "status-chip"}>
                      {isJoined ? "Joined" : isPending ? "Pending" : isRejected ? "Rejected" : "Open"}
                    </span>
                    <h3>{group.name}</h3>
                    <p className="muted-copy">
                      {group.activeMemberCount || 0} members
                    </p>
                  </div>
                  <div className="venue-meta">
                    <span>{group.createdBy === authUser.id ? "Owner" : "Group"}</span>
                  </div>
                </div>

                <div className="card-actions">
                  {!isJoined && !isPending ? (
                    <button className="primary-button" type="button" onClick={() => onJoin(group.id)}>
                      {isRejected ? "Request again" : "Request to join"}
                    </button>
                  ) : null}
                  <button className="ghost-button small" type="button" onClick={() => onShowMembers(group.id)}>
                    Show members
                  </button>
                </div>

                {members.length > 0 ? (
                  <div className="response-panel">
                    <div className="status-chip positive">Members</div>
                    {members.map((member) => (
                      <p className="muted-copy" key={member.id}>
                        {member.userName} - {member.role}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            );
              })}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function VenuesPage({
  canManageVenues,
  loading,
  error,
  venues,
  form,
  setForm,
  editingVenueId,
  onSubmit,
  onEdit,
  onDelete,
  onReset,
  feedback,
  saving,
  groups
}) {
  if (!canManageVenues) {
    return (
      <section className="stack-xl">
        <div className="section-head">
          <span className="eyebrow">Venues</span>
          <h1>Admin only</h1>
          <p>Venue management remains reserved for admin users.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="stack-xl">
      <div className="section-head">
        <span className="eyebrow">Venues</span>
        <h1>Manage venues</h1>
        <p>Admins control the venue inventory used by leaders when posting events.</p>
      </div>

      <div className="page-columns">
        <form className="panel stack-lg" onSubmit={onSubmit}>
          <div className="panel-header">
            <h2>{editingVenueId ? "Edit venue" : "Add venue"}</h2>
            {editingVenueId ? (
              <button className="ghost-button small" type="button" onClick={onReset}>
                Reset
              </button>
            ) : null}
          </div>

          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
          </label>
          <label className="field">
            <span>Group</span>
            <select value={form.groupId} onChange={(e) => setForm((c) => ({ ...c, groupId: e.target.value }))}>
              <option value="">No group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Address</span>
            <input value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} />
          </label>
          <label className="field">
            <span>Map URL</span>
            <input value={form.mapUrl} onChange={(e) => setForm((c) => ({ ...c, mapUrl: e.target.value }))} />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Latitude</span>
              <input type="number" step="0.0000001" value={form.latitude} onChange={(e) => setForm((c) => ({ ...c, latitude: e.target.value }))} />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input type="number" step="0.0000001" value={form.longitude} onChange={(e) => setForm((c) => ({ ...c, longitude: e.target.value }))} />
            </label>
          </div>

          <label className="toggle-row">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
            <span>Venue is active</span>
          </label>

          <button className="primary-button wide" disabled={saving} type="submit">
            {saving ? "Saving..." : editingVenueId ? "Update venue" : "Create venue"}
          </button>
          {feedback ? <p className="inline-feedback">{feedback}</p> : null}
        </form>

        <div className="stack-md">
          {loading ? <div className="panel">Loading venues...</div> : null}
          {error ? <div className="panel error-panel">{error}</div> : null}
          {!loading && venues.map((venue) => (
            <article className={venue.isActive ? "venue-card" : "venue-card inactive"} key={venue.id}>
              <div className="venue-card-top">
                <div>
                  <span className="status-chip">{venue.isActive ? "Active" : "Archived"}</span>
                  <h3>{venue.name}</h3>
                  <p className="muted-copy">{venue.address || "No address set"}</p>
                </div>
              </div>
              <div className="card-actions">
                <button className="ghost-button small" type="button" onClick={() => onEdit(venue)}>Edit</button>
                <button className="ghost-button danger small" type="button" onClick={() => onDelete(venue.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function getRouteFromHash() {
  const hash = window.location.hash.replace("#", "");
  return NAV_ITEMS.some((item) => item.key === hash) ? hash : "dashboard";
}

function navigate(route) {
  window.location.hash = route;
}

function buildIsoTimestamp(date, time) {
  return `${date}T${time}:00Z`;
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 10);
}

function toTimeInputValue(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(11, 16);
}

function getLeaderUpgradeUi(status, loading) {
  if (loading) {
    return {
      badge: "Submitting",
      label: "Submitting...",
      disabled: true,
      positive: false,
      description: "Your leader application is being sent to admin."
    };
  }

  switch (status) {
    case "PENDING":
      return {
        badge: "Pending review",
        label: "Pending approval",
        disabled: true,
        positive: false,
        description: "Your leader application is already pending. Admin review is still required."
      };
    case "APPROVED":
      return {
        badge: "Approved",
        label: "Approved",
        disabled: true,
        positive: true,
        description: "Your leader access has already been approved."
      };
    case "REJECTED":
      return {
        badge: "Rejected",
        label: "Apply again",
        disabled: false,
        positive: false,
        description: "Your last leader application was rejected. You can submit another request."
      };
    default:
      return {
        badge: "Role upgrade",
        label: "Apply for leader",
        disabled: false,
        positive: false,
        description: "Leaders can add and remove event posts. Your request goes to admin for approval."
      };
  }
}

export default App;
