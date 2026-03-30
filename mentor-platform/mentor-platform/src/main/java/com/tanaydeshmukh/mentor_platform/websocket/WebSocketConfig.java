package com.tanaydeshmukh.mentor_platform.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SessionWebSocketHandler sessionWebSocketHandler;
    private final SessionHandshakeInterceptor sessionHandshakeInterceptor;

    public WebSocketConfig(SessionWebSocketHandler sessionWebSocketHandler,
                           SessionHandshakeInterceptor sessionHandshakeInterceptor) {
        this.sessionWebSocketHandler = sessionWebSocketHandler;
        this.sessionHandshakeInterceptor = sessionHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(sessionWebSocketHandler, "/ws/session")
                .addInterceptors(sessionHandshakeInterceptor)
                .setAllowedOrigins("http://localhost:3000");
    }
}
