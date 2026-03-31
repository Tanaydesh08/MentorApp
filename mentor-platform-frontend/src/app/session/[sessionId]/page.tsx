"use client";

import {
  clearStoredToken,
  readEmailFromToken,
  readRoleFromToken,
  useStoredToken,
} from "@/lib/auth";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

type SocketMessage = {
  type: "chat" | "signal" | "system" | "presence" | "editor";
  sessionId: string;
  sender: string;
  clientId?: string;
  role: string;
  content: string | null;
  payload: unknown;
  timestamp: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  role: string;
  text: string;
  timestamp: string;
};

type EditorLanguage = "javascript" | "python";

type Participant = {
  email: string;
  clientId: string;
};

const starterEditorCode: Record<EditorLanguage, string> = {
  javascript: `function findStrongestPair(numbers) {
  return numbers.filter((value) => value % 2 === 0);
}

console.log(findStrongestPair([1, 2, 3, 4]));`,
  python: `def find_strongest_pair(numbers):
    return [value for value in numbers if value % 2 == 0]

print(find_strongest_pair([1, 2, 3, 4]))`,
};

function stopTracks(stream: MediaStream | null) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function attachStreamToVideo(videoElement: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!videoElement) {
    return;
  }

  videoElement.srcObject = stream;

  if (!stream) {
    return;
  }

  void videoElement.play().catch(() => undefined);
}

function normalizeParticipants(participants: Participant[]) {
  const seenClientIds = new Set<string>();

  return participants.filter((participant) => {
    if (!participant?.email || !participant?.clientId || seenClientIds.has(participant.clientId)) {
      return false;
    }

    seenClientIds.add(participant.clientId);
    return true;
  });
}

function isPresenceSystemMessage(text: string) {
  return /has joined|has left|joined the session|left the session/i.test(text);
}

function createWebSocketUrl(sessionId: string, token: string) {
  const base = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8080";
  const url = new URL("/ws/session", base);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("token", token);
  return url.toString();
}

export default function SessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const token = useStoredToken();
  const sessionId = params.sessionId;
  const currentEmail = readEmailFromToken(token);
  const currentRole = readRoleFromToken(token);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10),
  );
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const settingRemoteAnswerPendingRef = useRef(false);
  const editorSyncPauseRef = useRef<number | null>(null);
  const participantsRef = useRef<Participant[]>([]);
  const participantCountRef = useRef(0);
  const previousParticipantCountRef = useRef(0);
  const isStartingMediaRef = useRef(false);

  const [socketState, setSocketState] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");
  const [socketError, setSocketError] = useState("");
  const [mediaState, setMediaState] = useState<"idle" | "requesting" | "ready" | "error">("idle");
  const [mediaError, setMediaError] = useState("");
  const [peerState, setPeerState] = useState("Waiting for another participant");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [editorLanguage, setEditorLanguage] = useState<EditorLanguage>("javascript");
  const [editorCode, setEditorCode] = useState(starterEditorCode.javascript);
  const [editorOwner, setEditorOwner] = useState("System");
  const [isEditorSyncPaused, setIsEditorSyncPaused] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "seed-system",
      sender: "System",
      role: "SYSTEM",
      text: "Share this session id and join from another browser window to test realtime chat and the 1-on-1 call.",
      timestamp: new Date().toISOString(),
    },
  ]);

  const participantCount = participants.length;
  const otherParticipant = useMemo(
    () =>
      participants.find((participant) => participant.clientId !== clientIdRef.current)?.email ?? "",
    [participants],
  );
  const shouldBePolite = useMemo(() => {
    const sortedParticipants = [...participants]
      .map((participant) => participant.clientId)
      .sort();
    return sortedParticipants[0] !== clientIdRef.current;
  }, [participants]);
  const inviteUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/session/${sessionId}`;

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((currentMessages) => {
      if (currentMessages.some((currentMessage) => currentMessage.id === message.id)) {
        return currentMessages;
      }

      return [...currentMessages, message];
    });
  }, []);

  const addSystemMessage = useCallback((id: string, text: string) => {
    addMessage({
      id,
      sender: "System",
      role: "SYSTEM",
      text,
      timestamp: new Date().toISOString(),
    });
  }, [addMessage]);

  const sendSocketMessage = useCallback(
    (message: Omit<SocketMessage, "sender" | "role" | "timestamp">) => {
      const socket = socketRef.current;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      socket.send(
        JSON.stringify({
          ...message,
          sender: currentEmail,
          clientId: clientIdRef.current,
          role: currentRole,
          timestamp: new Date().toISOString(),
        }),
      );
    },
    [currentEmail, currentRole],
  );

  const resetPeerConnection = useCallback((nextPeerState?: string) => {
    remoteStreamRef.current = null;
    attachStreamToVideo(remoteVideoRef.current, null);

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    settingRemoteAnswerPendingRef.current = false;

    setHasRemoteStream(false);
    setPeerState(nextPeerState ?? "Waiting for another participant");
  }, []);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    connection.onicecandidate = (event) => {
      if (peerConnectionRef.current !== connection || !event.candidate) {
        return;
      }

      sendSocketMessage({
        type: "signal",
        sessionId,
        content: null,
        payload: { candidate: event.candidate.toJSON() },
      });
    };

    connection.ontrack = (event) => {
      if (peerConnectionRef.current !== connection) {
        return;
      }

      const [stream] = event.streams;
      const activeRemoteStream = stream ?? remoteStreamRef.current ?? new MediaStream();

      if (!stream) {
        activeRemoteStream.addTrack(event.track);
      }

      remoteStreamRef.current = activeRemoteStream;
      attachStreamToVideo(remoteVideoRef.current, activeRemoteStream);

      setHasRemoteStream(true);
      setPeerState("Connected");
    };

    connection.onconnectionstatechange = () => {
      if (peerConnectionRef.current !== connection || !connection.connectionState) {
        return;
      }

      if (connection.connectionState === "failed") {
        resetPeerConnection(
          participantCountRef.current > 1 ? "Reconnecting" : "Waiting for another participant",
        );
        return;
      }

      if (connection.connectionState === "disconnected" && participantCountRef.current > 1) {
        setPeerState("Reconnecting");
        return;
      }

      setPeerState(connection.connectionState === "connected" ? "Connected" : connection.connectionState);
    };

    connection.onnegotiationneeded = async () => {
      if (peerConnectionRef.current !== connection || participantCountRef.current < 2) {
        return;
      }

      try {
        makingOfferRef.current = true;
        await connection.setLocalDescription();

        if (!connection.localDescription) {
          return;
        }

        sendSocketMessage({
          type: "signal",
          sessionId,
          content: null,
          payload: { description: connection.localDescription },
        });
      } catch (error) {
        console.error("Negotiation failed", error);
      } finally {
        makingOfferRef.current = false;
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        connection.addTrack(track, localStreamRef.current as MediaStream);
      });
    }

    peerConnectionRef.current = connection;
    return connection;
  }, [resetPeerConnection, sendSocketMessage, sessionId]);

  const syncOutgoingTracks = useCallback(
    (stream: MediaStream) => {
      const connection = ensurePeerConnection();

      stream.getTracks().forEach((track) => {
        const existingSender = connection
          .getSenders()
          .find((sender) => sender.track?.kind === track.kind);

        if (existingSender) {
          void existingSender.replaceTrack(track);
          return;
        }

        connection.addTrack(track, stream);
      });
    },
    [ensurePeerConnection],
  );

  const startMedia = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMediaState("error");
      setMediaError("This browser does not support camera and microphone access.");
      return;
    }

    if (isStartingMediaRef.current) {
      return;
    }

    isStartingMediaRef.current = true;
    setMediaState("requesting");
    setMediaError("");

    try {
      if (screenStreamRef.current) {
        stopTracks(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsSharingScreen(false);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stopTracks(localStreamRef.current);
      localStreamRef.current = stream;
      attachStreamToVideo(localVideoRef.current, stream);

      syncOutgoingTracks(stream);
      setMediaState("ready");
      setIsMicEnabled(true);
      setIsCameraEnabled(true);
      setPeerState(participantCountRef.current > 1 ? "Connecting" : "Waiting for another participant");
    } catch (error) {
      setMediaState("error");
      setMediaError(
        error instanceof Error ? error.message : "Unable to access camera and microphone.",
      );
    } finally {
      isStartingMediaRef.current = false;
    }
  }, [syncOutgoingTracks]);

  const leaveMedia = useCallback(() => {
    stopTracks(screenStreamRef.current);
    stopTracks(localStreamRef.current);
    stopTracks(remoteStreamRef.current);

    screenStreamRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    attachStreamToVideo(localVideoRef.current, null);
    resetPeerConnection("Waiting for another participant");

    setIsMicEnabled(true);
    setIsCameraEnabled(true);
    setIsSharingScreen(false);
    setMediaError("");
    setMediaState("idle");
    setPeerState("Waiting for another participant");
  }, [resetPeerConnection]);

  const handleSignalPayload = useCallback(
    async (payload: unknown) => {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const signalPayload = payload as {
        description?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };

      const connection = ensurePeerConnection();

      try {
        if (signalPayload.description) {
          const readyForOffer =
            !makingOfferRef.current
            && (connection.signalingState === "stable" || settingRemoteAnswerPendingRef.current);
          const offerCollision =
            signalPayload.description.type === "offer" && !readyForOffer;

          ignoreOfferRef.current = !shouldBePolite && offerCollision;

          if (ignoreOfferRef.current) {
            return;
          }

          if (offerCollision && signalPayload.description.type === "offer") {
            await connection.setLocalDescription({ type: "rollback" });
          }

          settingRemoteAnswerPendingRef.current =
            signalPayload.description.type === "answer";

          await connection.setRemoteDescription(signalPayload.description);
          settingRemoteAnswerPendingRef.current = false;

          if (signalPayload.description.type === "offer") {
            if (!localStreamRef.current) {
              await startMedia();
            }

            await connection.setLocalDescription();

            if (!connection.localDescription) {
              return;
            }

            sendSocketMessage({
              type: "signal",
              sessionId,
              content: null,
              payload: { description: connection.localDescription },
            });
          }

          return;
        }

        if (signalPayload.candidate) {
          try {
            await connection.addIceCandidate(signalPayload.candidate);
          } catch (error) {
            if (!ignoreOfferRef.current) {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error("Signal handling failed", error);
        resetPeerConnection(
          participantCountRef.current > 1 ? "Reconnecting" : "Waiting for another participant",
        );
      }
    },
    [ensurePeerConnection, resetPeerConnection, sendSocketMessage, sessionId, shouldBePolite, startMedia],
  );

  const toggleTrack = useCallback((kind: "audio" | "video") => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const track = kind === "audio" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

    if (!track) {
      return;
    }

    track.enabled = !track.enabled;

    if (kind === "audio") {
      setIsMicEnabled(track.enabled);
      return;
    }

    setIsCameraEnabled(track.enabled);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      setMediaError("Screen sharing is not supported in this browser.");
      return;
    }

    if (!localStreamRef.current) {
      await startMedia();
    }

    if (isSharingScreen) {
      const connection = peerConnectionRef.current;
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = connection?.getSenders().find((currentSender) => currentSender.track?.kind === "video");

      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack);
      }

      stopTracks(screenStreamRef.current);
      screenStreamRef.current = null;
      setIsSharingScreen(false);

      attachStreamToVideo(localVideoRef.current, localStreamRef.current);

      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const displayTrack = displayStream.getVideoTracks()[0];
      const connection = ensurePeerConnection();
      const sender = connection.getSenders().find((currentSender) => currentSender.track?.kind === "video");

      if (!displayTrack) {
        return;
      }

      screenStreamRef.current = displayStream;

      if (sender) {
        await sender.replaceTrack(displayTrack);
      } else {
        connection.addTrack(displayTrack, displayStream);
      }

      attachStreamToVideo(localVideoRef.current, displayStream);

      displayTrack.onended = () => {
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        const currentSender = peerConnectionRef.current
          ?.getSenders()
          .find((sender) => sender.track?.kind === "video");

        if (currentSender && cameraTrack) {
          void currentSender.replaceTrack(cameraTrack);
        }

        stopTracks(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsSharingScreen(false);

        attachStreamToVideo(localVideoRef.current, localStreamRef.current);
      };

      setIsSharingScreen(true);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Unable to start screen sharing.");
    }
  }, [ensurePeerConnection, isSharingScreen, startMedia]);

  const copyInviteLink = useCallback(async () => {
    if (!inviteUrl || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [inviteUrl]);

  const sendChatMessage = useCallback(() => {
    const text = draftMessage.trim();

    if (!text) {
      return;
    }

    sendSocketMessage({
      type: "chat",
      sessionId,
      content: text,
      payload: null,
    });
    addMessage({
      id: `local-chat-${Date.now()}`,
      sender: currentEmail || "You",
      role: currentRole || "USER",
      text,
      timestamp: new Date().toISOString(),
    });
    setDraftMessage("");
  }, [addMessage, currentEmail, currentRole, draftMessage, sendSocketMessage, sessionId]);

  const sendCodeSnippet = useCallback(() => {
    const snippet = editorCode.trim();

    if (!snippet) {
      return;
    }

    sendSocketMessage({
      type: "chat",
      sessionId,
      content: `Code snippet (${editorLanguage})\n${snippet}`,
      payload: null,
    });
    addMessage({
      id: `local-snippet-${Date.now()}`,
      sender: currentEmail || "You",
      role: currentRole || "USER",
      text: `Code snippet (${editorLanguage})\n${snippet}`,
      timestamp: new Date().toISOString(),
    });
  }, [addMessage, currentEmail, currentRole, editorCode, editorLanguage, sendSocketMessage, sessionId]);

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendChatMessage();
    }
  };

  const handleSocketMessage = useEffectEvent((event: MessageEvent<string>) => {
    let message: SocketMessage;

    try {
      message = JSON.parse(event.data) as SocketMessage;
    } catch {
      return;
    }

    if (message.type === "presence") {
      const payload = message.payload as { participants?: Participant[] } | null;
      const nextParticipants = normalizeParticipants(payload?.participants ?? []);
      const previousParticipants = participantsRef.current;
      const previousParticipantIds = new Set(
        previousParticipants.map((participant) => participant.clientId),
      );
      const nextParticipantIds = new Set(nextParticipants.map((participant) => participant.clientId));

      participantsRef.current = nextParticipants;
      participantCountRef.current = nextParticipants.length;
      setParticipants(nextParticipants);

      nextParticipants
        .filter(
          (participant) =>
            participant.clientId !== clientIdRef.current
            && !previousParticipantIds.has(participant.clientId),
        )
        .forEach((participant) => {
          addSystemMessage(
            `presence-join-${participant.clientId}`,
            `${participant.email} has joined the session.`,
          );
        });

      previousParticipants
        .filter(
          (participant) =>
            participant.clientId !== clientIdRef.current
            && !nextParticipantIds.has(participant.clientId),
        )
        .forEach((participant) => {
          addSystemMessage(
            `presence-left-${participant.clientId}-${message.timestamp}`,
            `${participant.email} has left the session.`,
          );
        });

      return;
    }

    if (message.type === "signal") {
      if (message.clientId === clientIdRef.current) {
        return;
      }

      void handleSignalPayload(message.payload);
      return;
    }

    if (message.type === "editor") {
      if (message.clientId === clientIdRef.current) {
        return;
      }

      const payload = message.payload as { language?: EditorLanguage; code?: string } | null;

      if (!payload?.language || typeof payload.code !== "string") {
        return;
      }

      if (editorSyncPauseRef.current) {
        window.clearTimeout(editorSyncPauseRef.current);
      }

      setIsEditorSyncPaused(true);
      setEditorLanguage(payload.language);
      setEditorCode(payload.code);
      setEditorOwner(message.sender);

      editorSyncPauseRef.current = window.setTimeout(() => {
        setIsEditorSyncPaused(false);
      }, 250);
      return;
    }

    if (!message.content) {
      return;
    }

    if (message.type === "chat" && message.clientId === clientIdRef.current) {
      return;
    }

    if (message.type === "system" && isPresenceSystemMessage(message.content)) {
      return;
    }

    addMessage({
      id: `${message.timestamp}-${message.sender}-${message.type}`,
      sender: message.sender,
      role: message.role,
      text: message.content,
      timestamp: message.timestamp,
    });
  });

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [router, token]);

  useEffect(() => {
    if (!token || !sessionId) {
      return;
    }

    setSocketState("connecting");
    const socketUrl = new URL(createWebSocketUrl(sessionId, token));
    socketUrl.searchParams.set("clientId", clientIdRef.current);
    const socket = new WebSocket(socketUrl.toString());
    socketRef.current = socket;

    socket.onopen = () => {
      if (socketRef.current !== socket) {
        return;
      }

      setSocketState("open");
      setSocketError("");
    };

    socket.onmessage = (event) => {
      handleSocketMessage(event);
    };

    socket.onerror = () => {
      if (socketRef.current !== socket) {
        return;
      }

      setSocketState("error");
      setSocketError("Unable to connect to the realtime session server.");
    };

    socket.onclose = () => {
      if (socketRef.current !== socket) {
        return;
      }

      setSocketState("closed");
      participantsRef.current = [];
      participantCountRef.current = 0;
      previousParticipantCountRef.current = 0;
      setParticipants([]);
      resetPeerConnection("Waiting for another participant");
    };

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [resetPeerConnection, sessionId, token]);

  useEffect(() => {
    if (isEditorSyncPaused || socketState !== "open") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      sendSocketMessage({
        type: "editor",
        sessionId,
        content: null,
        payload: {
          language: editorLanguage,
          code: editorCode,
        },
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editorCode, editorLanguage, isEditorSyncPaused, sendSocketMessage, sessionId, socketState]);

  useEffect(() => {
    participantsRef.current = participants;
    participantCountRef.current = participants.length;
  }, [participants]);

  useEffect(() => {
    const previousParticipantCount = previousParticipantCountRef.current;

    if (participantCount > 1 && previousParticipantCount < 2 && mediaState === "idle") {
      void startMedia();
    }

    previousParticipantCountRef.current = participantCount;
  }, [mediaState, participantCount, startMedia]);

  useEffect(() => {
    if (participantCount < 2) {
      if (peerConnectionRef.current || hasRemoteStream) {
        resetPeerConnection("Waiting for another participant");
      } else {
        setPeerState("Waiting for another participant");
      }

      return;
    }

    if (mediaState === "ready" && !hasRemoteStream) {
      setPeerState("Connecting");
      return;
    }

    if (mediaState === "error") {
      setPeerState("Media permission needed");
      return;
    }

    if (mediaState !== "ready") {
      setPeerState("Participant joined");
    }
  }, [hasRemoteStream, mediaState, participantCount, resetPeerConnection]);

  useEffect(() => {
    if (
      socketState !== "open"
      || mediaState !== "ready"
      || participantCount < 2
      || !currentEmail
    ) {
      return;
    }

    const connection = ensurePeerConnection();
    const sortedParticipants = [...participants]
      .map((participant) => participant.clientId)
      .sort();

    if (
      sortedParticipants[0] !== clientIdRef.current
      || makingOfferRef.current
      || connection.signalingState !== "stable"
      || connection.remoteDescription
    ) {
      return;
    }

    void (async () => {
      try {
        makingOfferRef.current = true;
        await connection.setLocalDescription();

        if (!connection.localDescription) {
          return;
        }

        sendSocketMessage({
          type: "signal",
          sessionId,
          content: null,
          payload: { description: connection.localDescription },
        });
      } catch (error) {
        console.error("Initial offer failed", error);
      } finally {
        makingOfferRef.current = false;
      }
    })();
  }, [currentEmail, ensurePeerConnection, mediaState, participantCount, participants, sendSocketMessage, sessionId, socketState]);

  useEffect(() => {
    return () => {
      if (editorSyncPauseRef.current) {
        window.clearTimeout(editorSyncPauseRef.current);
      }

      leaveMedia();
    };
  }, [leaveMedia]);

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#0b0c0e] px-3 py-3 text-white sm:px-4">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-[1560px] flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#131416] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.4)]">
        <header className="shrink-0 flex flex-col gap-4 border-b border-white/10 px-2 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-white/45">MentorSync session</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Session {sessionId}
            </h1>
            <p className="mt-2 text-sm leading-7 text-white/60">
              Meet-style layout: video on the left, Monaco editor on the top-right, and realtime chat on the bottom-right.
            </p>
            {currentEmail ? (
              <p className="mt-2 text-sm text-white/55">
                {currentEmail} | {currentRole || "USER"}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copyInviteLink}
              className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              {copied ? "Copied" : "Copy Link"}
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Back
            </Link>
            <button
              onClick={() => {
                leaveMedia();
                clearStoredToken();
                router.push("/login");
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.72fr_0.98fr]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-white/12 bg-[#0f1012] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-white/40">Video call</p>
                <h2 className="mt-2 text-xl font-semibold text-white">1-on-1 room</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  `${participantCount} participant${participantCount === 1 ? "" : "s"}`,
                  `Socket ${socketState}`,
                  peerState,
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[8px] border border-white/12 bg-[#090a0c]">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`h-full w-full object-cover ${hasRemoteStream ? "block" : "hidden"}`}
              />

              {hasRemoteStream ? null : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#1f2329_0%,#101215_58%,#0a0b0d_100%)] px-6 text-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/6 text-4xl font-semibold text-white/90">
                    {(otherParticipant || "?")[0]?.toUpperCase() || "?"}
                  </div>
                  <p className="mt-5 text-lg font-medium text-white">
                    {otherParticipant || "Waiting for participant"}
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-7 text-white/55">
                    {participantCount > 1
                      ? "The other participant is here. Allow camera and microphone access and the call will connect in this panel."
                      : "Share the session link and ask the other participant to join this same room."}
                  </p>
                </div>
              )}

              <div className="absolute bottom-4 left-4 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/75 backdrop-blur">
                Session code: {sessionId}
              </div>

              <div className="absolute bottom-4 right-4 h-40 w-60 overflow-hidden rounded-[8px] border border-white/12 bg-[#101114] shadow-[0_14px_32px_rgba(0,0,0,0.4)]">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${mediaState === "ready" && isCameraEnabled ? "block" : "hidden"}`}
                />

                {mediaState === "ready" && isCameraEnabled ? null : (
                  <div className="flex h-full flex-col items-center justify-center bg-[linear-gradient(180deg,#17191d_0%,#0e1013_100%)] px-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/6 text-lg font-semibold text-white/90">
                      {(currentEmail[0] ?? "Y").toUpperCase()}
                    </div>
                    <p className="mt-3 text-sm font-medium text-white">You</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      {mediaState === "requesting"
                        ? "Requesting camera and microphone"
                        : mediaState === "error"
                          ? mediaError || "Media access unavailable"
                          : "Camera preview will appear here"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 shrink-0 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  void startMedia();
                }}
                className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-300"
              >
                {mediaState === "ready" ? "Restart Camera and Mic" : "Start Camera and Mic"}
              </button>
              <button
                onClick={() => toggleTrack("audio")}
                disabled={mediaState !== "ready"}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMicEnabled ? "Mute Mic" : "Unmute Mic"}
              </button>
              <button
                onClick={() => toggleTrack("video")}
                disabled={mediaState !== "ready"}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
              </button>
              <button
                onClick={() => {
                  void toggleScreenShare();
                }}
                disabled={mediaState !== "ready"}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSharingScreen ? "Stop Sharing" : "Share Screen"}
              </button>
              <button
                onClick={leaveMedia}
                disabled={mediaState === "idle"}
                className="rounded-full border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Leave Media
              </button>
            </div>

            {socketError ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                {socketError}
              </div>
            ) : null}

            {mediaError ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                {mediaError}
              </div>
            ) : null}
          </section>

          <aside className="grid min-h-0 gap-4 xl:grid-rows-[minmax(0,1fr)_minmax(0,0.88fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-white/12 bg-[#0f1012] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-white/40">Code editor</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Shared Monaco editor</h2>
                  <p className="mt-2 text-sm leading-7 text-white/55">
                    Language and code changes are broadcast over the session WebSocket. This keeps the collaboration flow lightweight and interview-friendly.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={sendCodeSnippet}
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Send Snippet
                  </button>
                  <select
                    value={editorLanguage}
                    onChange={(event) => {
                      const language = event.target.value as EditorLanguage;
                      setEditorLanguage(language);
                      setEditorCode((currentCode) =>
                        currentCode.trim() ? currentCode : starterEditorCode[language],
                      );
                      setEditorOwner(currentEmail || "You");
                    }}
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white outline-none"
                  >
                    <option value="javascript" className="bg-slate-950">
                      JavaScript
                    </option>
                    <option value="python" className="bg-slate-950">
                      Python
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] border border-white/12 bg-[#08090b]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-white/45">
                  <div className="flex items-center gap-2">
                    {["#ef4444", "#f59e0b", "#10b981"].map((color) => (
                      <span
                        key={color}
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span>Last synced by {editorOwner}</span>
                </div>
                <div className="min-h-0 flex-1">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    language={editorLanguage}
                    value={editorCode}
                    onChange={(value) => {
                      setEditorCode(value ?? "");
                      setEditorOwner(currentEmail || "You");
                    }}
                    theme="vs-dark"
                    options={{
                      automaticLayout: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      padding: { top: 14 },
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-white/12 bg-[#0f1012] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-white/40">Messages</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Realtime chat</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  {messages.length} messages
                </span>
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto rounded-[8px] border border-white/12 bg-[#08090b] p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-[8px] border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                      {message.sender}
                      {message.role && message.role !== "SYSTEM" ? ` | ${message.role}` : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/80">
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 shrink-0 flex gap-3">
                <input
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  placeholder="Send a realtime room message"
                  className="w-full rounded-full border border-white/10 bg-[#0c0d0f] px-4 py-3 text-sm text-white outline-none focus:border-sky-300/50"
                />
                <button
                  onClick={sendChatMessage}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200"
                >
                  Send
                </button>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
