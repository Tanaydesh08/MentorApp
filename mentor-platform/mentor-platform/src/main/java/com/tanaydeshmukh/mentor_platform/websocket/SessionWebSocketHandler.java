package com.tanaydeshmukh.mentor_platform.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SessionWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    public SessionWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = getAttribute(session, "sessionId");
        rooms.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(session);

        sendPresence(sessionId);
        broadcastSystemMessage(sessionId, getAttribute(session, "email") + " joined the room.");
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        SocketMessage incoming = objectMapper.readValue(message.getPayload(), SocketMessage.class);
        String sessionId = getAttribute(session, "sessionId");
        String email = getAttribute(session, "email");
        String role = getAttribute(session, "role");
        String clientId = getAttribute(session, "clientId");

        if (!sessionId.equals(incoming.sessionId())) {
            return;
        }

        SocketMessage outbound = new SocketMessage(
                incoming.type(),
                sessionId,
                email,
                clientId,
                role,
                incoming.content(),
                incoming.payload(),
                Instant.now().toString()
        );

        if ("signal".equals(incoming.type())) {
            broadcastToOthers(sessionId, session, outbound);
            return;
        }

        broadcastToAll(sessionId, outbound);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = getAttribute(session, "sessionId");
        Set<WebSocketSession> roomSessions = rooms.get(sessionId);

        if (roomSessions != null) {
            roomSessions.remove(session);

            if (roomSessions.isEmpty()) {
                rooms.remove(sessionId);
            } else {
                broadcastSystemMessage(sessionId, getAttribute(session, "email") + " left the room.");
                sendPresence(sessionId);
            }
        }
    }

    private void broadcastSystemMessage(String sessionId, String content) throws IOException {
        SocketMessage systemMessage = new SocketMessage(
                "system",
                sessionId,
                "System",
                "system",
                "SYSTEM",
                content,
                null,
                Instant.now().toString()
        );

        broadcastToAll(sessionId, systemMessage);
    }

    private void sendPresence(String sessionId) throws IOException {
        Set<WebSocketSession> roomSessions = rooms.get(sessionId);

        if (roomSessions == null || roomSessions.isEmpty()) {
            return;
        }

        List<Map<String, String>> participants = roomSessions.stream()
                .map(roomSession -> Map.of(
                        "email", getAttribute(roomSession, "email"),
                        "clientId", getAttribute(roomSession, "clientId")
                ))
                .sorted((left, right) -> left.get("clientId").compareTo(right.get("clientId")))
                .toList();

        SocketMessage presenceMessage = new SocketMessage(
                "presence",
                sessionId,
                "System",
                "system",
                "SYSTEM",
                null,
                Map.of("participants", participants),
                Instant.now().toString()
        );

        broadcastToAll(sessionId, presenceMessage);
    }

    private void broadcastToAll(String sessionId, SocketMessage message) throws IOException {
        Set<WebSocketSession> roomSessions = rooms.get(sessionId);

        if (roomSessions == null) {
            return;
        }

        List<WebSocketSession> closedSessions = new ArrayList<>();
        String payload = objectMapper.writeValueAsString(message);

        for (WebSocketSession roomSession : roomSessions) {
            if (!roomSession.isOpen()) {
                closedSessions.add(roomSession);
                continue;
            }

            roomSession.sendMessage(new TextMessage(payload));
        }

        roomSessions.removeAll(closedSessions);
    }

    private void broadcastToOthers(String sessionId,
                                   WebSocketSession sourceSession,
                                   SocketMessage message) throws IOException {
        Set<WebSocketSession> roomSessions = rooms.get(sessionId);

        if (roomSessions == null) {
            return;
        }

        String payload = objectMapper.writeValueAsString(message);

        for (WebSocketSession roomSession : roomSessions) {
            if (roomSession == sourceSession || !roomSession.isOpen()) {
                continue;
            }

            roomSession.sendMessage(new TextMessage(payload));
        }
    }

    private String getAttribute(WebSocketSession session, String key) {
        Object value = session.getAttributes().get(key);
        return value == null ? "" : value.toString();
    }

    private record SocketMessage(
            String type,
            String sessionId,
            String sender,
            String clientId,
            String role,
            String content,
            Object payload,
            String timestamp
    ) {
    }
}
